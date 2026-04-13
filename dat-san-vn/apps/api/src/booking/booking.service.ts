import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/index.js';
import { success } from '../common/helpers/api-response.helper.js';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      throw new BadRequestException('Time slot does not belong to the specified field');
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
        data: { status: 'LOCKED' },
      });

      if (updatedSlot.count === 0) {
        throw new BadRequestException('Slot was taken concurrently or is no longer available');
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
    return success(booking, 'Booking created successfully', 201);
  }

  async confirmBooking(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSlots: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Verify owner
    const ownership = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId: ownerId, venueId: booking.venueId } },
    });

    if (!ownership || ownership.status !== 'APPROVED') {
      throw new ForbiddenException('You do not have permission to confirm this booking');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(`Booking is in ${booking.status} status and cannot be confirmed`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const conf = await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });

      // Mark slots as BOOKED
      for (const bs of booking.bookingSlots) {
        await tx.venueSlot.update({
          where: { id: bs.venueSlotId },
          data: { status: 'BOOKED' },
        });
      }

      return conf;
    });

    this.logger.log(`Booking confirmed: ${bookingId} by owner: ${ownerId}`);
    return success(updated, 'Booking confirmed successfully');
  }

  async cancelBooking(bookingId: string, userId: string, isOwnerCancel: boolean = false) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSlots: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (!isOwnerCancel) {
      if (booking.userId !== userId) {
        throw new ForbiddenException('You can only cancel your own bookings');
      }
    } else {
      // Owner cancel
      const ownership = await this.prisma.venueOwner.findUnique({
        where: { userId_venueId: { userId, venueId: booking.venueId } },
      });
      if (!ownership || ownership.status !== 'APPROVED') {
        throw new ForbiddenException('You do not have permission to cancel this booking as an owner');
      }
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
      throw new BadRequestException(`Booking is already ${booking.status}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const canc = await tx.booking.update({
        where: { id: bookingId },
        data: { 
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: userId
        },
      });

      // Release slots back to AVAILABLE
      for (const bs of booking.bookingSlots) {
        await tx.venueSlot.update({
          where: { id: bs.venueSlotId },
          data: { status: 'AVAILABLE' },
        });
      }

      return canc;
    });

    this.logger.log(`Booking cancelled: ${bookingId} by ${userId}`);
    return success(updated, 'Booking cancelled successfully');
  }

  async getMyBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        venue: { select: { id: true, name: true, address: true } },
        bookingSlots: {
          include: {
            venueSlot: { include: { field: { select: { name: true, sportType: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(bookings, 'User bookings retrieved successfully');
  }
}
