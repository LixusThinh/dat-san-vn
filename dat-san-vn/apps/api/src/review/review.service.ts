import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) { }

  async checkEligibility(userId: string, venueId: string) {
    // Tìm các booking của user tại venue chưa được review
    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        venueId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        review: null,
      },
      include: {
        bookingSlots: {
          include: {
            venueSlot: true,
          },
        },
      },
    });

    const now = new Date();

    // Lọc ra các booking đã qua thời gian (dựa vào max endTime của các slots)
    const eligibleBookingIds = bookings
      .filter((booking) => {
        if (booking.status === BookingStatus.COMPLETED) return true;

        if (!booking.bookingSlots.length) return false;

        // Kiểm tra xem tất cả các slot đã đá xong chưa
        const isPast = booking.bookingSlots.every((bs) => {
          const bsDate = new Date(bs.venueSlot.date);
          const endTime = new Date(bs.venueSlot.endTime);

          const endDateTime = new Date(
            bsDate.getFullYear(),
            bsDate.getMonth(),
            bsDate.getDate(),
            endTime.getUTCHours(),
            endTime.getUTCMinutes()
          );

          // Trừ múi giờ nếu cần, ở đây giả lập so sánh đơn giản
          // Trong database đang lưu theo UTC, getUTCHours() lấy đúng giờ đã lưu.
          return endDateTime < now;
        });

        return isPast;
      })
      .map((b) => b.id);

    return eligibleBookingIds;
  }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { venueId, bookingId, rating, comment } = createReviewDto;

    // Check if review already exists for this booking
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      throw new ConflictException('Bạn đã đánh giá booking này rồi');
    }

    // Verify booking legitimacy
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking');
    }

    if (booking.userId !== userId) {
      throw new BadRequestException('Bạn không sở hữu booking này');
    }

    if (booking.venueId !== venueId) {
      throw new BadRequestException('Booking không thuộc về địa điểm này');
    }

    // Eligibility check
    const eligibleIds = await this.checkEligibility(userId, venueId);
    if (!eligibleIds.includes(bookingId)) {
      throw new BadRequestException('Bạn chưa thể đánh giá booking này. Chờ đến khi đá xong nhé!');
    }

    // Create review and update venue stats in a transaction
    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          userId,
          venueId,
          bookingId,
          rating,
          comment,
        },
      });

      // Recalculate average rating for venue
      const aggregates = await tx.review.aggregate({
        where: { venueId },
        _avg: { rating: true },
        _count: { id: true },
      });

      const avgRating = aggregates._avg.rating || 0;
      const count = aggregates._count.id || 0;

      await tx.venue.update({
        where: { id: venueId },
        data: {
          rating: avgRating,
          reviewCount: count,
        },
      });

      return newReview;
    });

    return review;
  }

  async findAllByVenue(venueId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { venueId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { venueId } }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
