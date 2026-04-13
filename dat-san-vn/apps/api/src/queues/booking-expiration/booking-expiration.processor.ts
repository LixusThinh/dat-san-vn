import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';

@Processor('booking-expiration', { concurrency: 5, maxStalledCount: 10 })
export class BookingExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpirationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ bookingId: string }>): Promise<void> {
    const { bookingId } = job.data;
    this.logger.log(`Processing expiration job for bookingId: ${bookingId}`);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingSlots: true },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found, skipping expiration job.`);
      return;
    }

    if (booking.status !== 'PENDING') {
      this.logger.log(`Booking ${bookingId} is in status ${booking.status}, skipping expiration.`);
      return;
    }

    // Process expiration
    try {
      await this.prisma.$transaction(async (tx) => {
        // Double check status in case it changed instantly
        const currentBooking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { status: true }
        });
        
        if (currentBooking?.status !== 'PENDING') return;

        // Update Booking: status = 'CANCELLED', cancelledAt = now(), reason = 'AUTO_EXPIRED'
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: 'AUTO_EXPIRED',
          },
        });

        // Release slot: update TimeSlot status = AVAILABLE
        for (const bs of booking.bookingSlots) {
          await tx.venueSlot.update({
            where: { id: bs.venueSlotId },
            data: { status: 'AVAILABLE' },
          });
        }
      });
      this.logger.log(`Booking ${bookingId} successfully auto-expired and slots released.`);
    } catch (error) {
      this.logger.error(`Failed to execute expiration transaction for bookingId: ${bookingId}`, error);
      throw error; // Let BullMQ retry
    }
  }
}
