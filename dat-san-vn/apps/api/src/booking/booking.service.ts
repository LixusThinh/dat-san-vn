import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CancelBookingDto, CreateBookingDto } from './dto/index.js';
import { success } from '../common/helpers/api-response.helper.js';
import { BookingExpirationService } from '../queues/booking-expiration/booking-expiration.service.js';
import {
  assertOptimisticUpdate,
  withOptimisticLock,
} from '../common/optimistic-lock.guard.js';

interface ManagedBookingFilters {
  status?: string;
  date?: string;
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingExpirationService: BookingExpirationService,
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto) {
    // 1. Validate slot availability
    const slot = await this.prisma.venueSlot.findUnique({
      where: { id: dto.timeSlotId },
      include: { field: { include: { venue: true } } },
    });

    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    if (slot.fieldId !== dto.fieldId) {
      throw new BadRequestException(
        'Time slot does not belong to the specified field',
      );
    }

    if (slot.status !== 'AVAILABLE') {
      throw new BadRequestException('Time slot is no longer available');
    }

    // 2. Create booking and lock slot within transaction
    const venueId = slot.field.venue.id;
    const totalPrice = slot.pricePerSlot;

    const booking = await this.prisma.$transaction(async (tx) => {
      // Re-verify strictly with update status assert
      const updatedSlot = await tx.venueSlot.updateMany({
        where: { id: slot.id, status: 'AVAILABLE' },
        data: { status: 'LOCKED', version: { increment: 1 } },
      });

      if (updatedSlot.count === 0) {
        throw new BadRequestException(
          'Slot was taken concurrently or is no longer available',
        );
      }

      // Create Booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          venueId,
          status: 'PENDING',
          totalPrice,
          note: dto.note,
          bookingSlots: {
            create: {
              venueSlotId: slot.id,
            },
          },
        },
      });

      return newBooking;
    });

    this.logger.log(`Booking created: ${booking.id} by user: ${userId}`);

    // Phase 5: Hook into Booking Flow
    await this.bookingExpirationService.addExpirationJob(booking.id);

    return success(booking, 'Booking created successfully', 201);
  }

  async confirmBooking(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSlots: {
          include: {
            venueSlot: {
              select: { id: true, status: true, version: true },
            },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Verify owner
    const ownership = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId: ownerId, venueId: booking.venueId } },
    });

    if (!ownership || ownership.status !== 'APPROVED') {
      throw new ForbiddenException(
        'You do not have permission to confirm this booking',
      );
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Booking is in ${booking.status} status and cannot be confirmed`,
      );
    }

    const updated = await withOptimisticLock(
      () =>
        this.prisma.$transaction(async (tx) => {
          const bookingUpdate = await tx.booking.updateMany({
            where: {
              id: bookingId,
              version: booking.version,
              status: 'PENDING',
            },
            data: { status: 'CONFIRMED', version: { increment: 1 } },
          });
          assertOptimisticUpdate(bookingUpdate);

          // Mark slots as BOOKED
          for (const bs of booking.bookingSlots) {
            const slotUpdate = await tx.venueSlot.updateMany({
              where: {
                id: bs.venueSlot.id,
                version: bs.venueSlot.version,
                status: 'LOCKED',
              },
              data: { status: 'BOOKED', version: { increment: 1 } },
            });
            assertOptimisticUpdate(
              slotUpdate,
              'Slot đã thay đổi, vui lòng thử lại',
            );
          }

          return tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
          });
        }),
      booking.version,
    );

    this.logger.log(`Booking confirmed: ${bookingId} by owner: ${ownerId}`);
    return success(updated, 'Booking confirmed successfully');
  }

  async cancelBooking(
    bookingId: string,
    userId: string,
    isOwnerCancel: boolean = false,
    reason?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSlots: {
          include: {
            venueSlot: {
              select: {
                id: true,
                date: true,
                startTime: true,
                status: true,
                version: true,
              },
            },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (!isOwnerCancel) {
      if (booking.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException('Không thể hủy booking này');
      }
    } else {
      // Owner cancel
      const ownership = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId, venueId: booking.venueId } },
      });
      if (!ownership || ownership.status !== 'APPROVED') {
        throw new ForbiddenException(
          'You do not have permission to cancel this booking as an owner',
        );
      }

      if (booking.status === 'CONFIRMED') {
        const bookingStart = this.getBookingStartDate(booking.bookingSlots);

        if (bookingStart.getTime() - Date.now() <= 24 * 60 * 60 * 1000) {
          throw new BadRequestException(
            'Confirmed bookings can only be cancelled by owners more than 24 hours in advance',
          );
        }
      }
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException(`Booking is already ${booking.status}`);
    }

    const refundPercent = this.getRefundPercent(this.getBookingStartDate(booking.bookingSlots));
    const refundAmount = Number(booking.totalPrice) * (refundPercent / 100);

    const updated = await withOptimisticLock(
      () =>
        this.prisma.$transaction(async (tx) => {
          const bookingUpdate = await tx.booking.updateMany({
            where: {
              id: bookingId,
              version: booking.version,
              status: booking.status,
            },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
              cancelledBy: userId,
              cancelReason: reason,
              refundAmount,
              version: { increment: 1 },
            },
          });
          assertOptimisticUpdate(bookingUpdate);

          if (refundAmount > 0) {
            await tx.payment.updateMany({
              where: { bookingId },
              data: {
                refundAmount,
                refundedAt: new Date(),
                status:
                  refundPercent === 100
                    ? PaymentStatus.REFUNDED_FULL
                    : PaymentStatus.REFUNDED_HALF,
              },
            });
          }

          // Release slots back to AVAILABLE
          for (const bs of booking.bookingSlots) {
            const slotUpdate = await tx.venueSlot.updateMany({
              where: {
                id: bs.venueSlot.id,
                version: bs.venueSlot.version,
                status: { in: ['LOCKED', 'BOOKED'] },
              },
              data: { status: 'AVAILABLE', version: { increment: 1 } },
            });
            assertOptimisticUpdate(
              slotUpdate,
              'Slot đã thay đổi, vui lòng thử lại',
            );
          }

          return tx.booking.findUniqueOrThrow({
            where: { id: bookingId },
          });
        }),
      booking.version,
    );

    this.logger.log(`Booking cancelled: ${bookingId} by ${userId}`);
    return success(
      {
        ...updated,
        refundPercent,
      },
      `Đã hủy booking. Hoàn tiền ${refundPercent}% (${refundAmount})`,
    );
  }

  async cancelMyBooking(dto: CancelBookingDto, userId: string) {
    return this.cancelBooking(dto.bookingId, userId, false, dto.reason);
  }

  async getMyBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        bookingSlots: {
          include: {
            venueSlot: {
              include: { field: { select: { name: true, sportType: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(bookings, 'User bookings retrieved successfully');
  }

  async getManagedBookings(
    userId: string,
    role: UserRole,
    filters: ManagedBookingFilters = {},
  ) {
    const where: Record<string, unknown> = {};
    const normalizedStatus =
      filters.status && filters.status !== 'ALL' ? filters.status : undefined;

    if (normalizedStatus) {
      if (
        !Object.values(BookingStatus).includes(
          normalizedStatus as BookingStatus,
        )
      ) {
        throw new BadRequestException('Invalid booking status filter');
      }

      where.status = normalizedStatus;
    }

    const normalizedDate = this.parseDateFilter(filters.date);
    if (normalizedDate) {
      where.bookingSlots = {
        some: {
          venueSlot: {
            date: normalizedDate,
          },
        },
      };
    }

    if (role !== UserRole.ADMIN) {
      where.venue = {
        owners: {
          some: {
            userId,
            status: 'APPROVED',
          },
        },
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        venue: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
          },
        },
        bookingSlots: {
          include: {
            venueSlot: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                pricePerSlot: true,
                field: {
                  select: {
                    id: true,
                    name: true,
                    sportType: true,
                    size: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(bookings, 'Managed bookings retrieved successfully');
  }

  private parseDateFilter(date?: string) {
    if (!date) return null;

    const normalized = date === 'today' ? new Date() : new Date(date);

    if (Number.isNaN(normalized.getTime())) {
      throw new BadRequestException('Invalid booking date filter');
    }

    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private getBookingStartDate(
    bookingSlots: Array<{ venueSlot: { date: Date; startTime: Date } }>,
  ) {
    const firstSlot = bookingSlots
      .map((bookingSlot) => bookingSlot.venueSlot)
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.getTime() - b.startTime.getTime();
      })[0];

    if (!firstSlot) {
      throw new BadRequestException(
        'Booking has no slots to determine its start time',
      );
    }

    const start = new Date(firstSlot.date);
    start.setHours(
      firstSlot.startTime.getHours(),
      firstSlot.startTime.getMinutes(),
      firstSlot.startTime.getSeconds(),
      0,
    );

    return start;
  }

  private getRefundPercent(bookingStart: Date) {
    const hoursUntilStart =
      (bookingStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilStart > 12) return 100;
    if (hoursUntilStart > 6) return 50;
    return 0;
  }
}
