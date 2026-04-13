import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);
  private readonly delayMs: number;

  constructor(
    @InjectQueue('booking-expiration') private readonly bookingQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    const minutes = this.configService.get<number>('BOOKING_EXPIRATION_MINUTES', 15);
    this.delayMs = minutes * 60 * 1000;
  }

  async addExpirationJob(bookingId: string): Promise<void> {
    try {
      await this.bookingQueue.add(
        'expire-booking',
        { bookingId },
        { 
          jobId: bookingId, // Idempotent 
          delay: this.delayMs,
        }
      );
      this.logger.log(`Added booking expiration job for bookingId: ${bookingId} (delay: ${this.delayMs}ms)`);
    } catch (error) {
      this.logger.error(`Failed to add expiration job for bookingId: ${bookingId}`, error);
    }
  }
}
