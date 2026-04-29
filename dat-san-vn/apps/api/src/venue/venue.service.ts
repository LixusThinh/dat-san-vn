// ============================================================
// DatSanVN — VenueService
// CRUD operations for venues with ownership verification
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVenueDto, UpdateVenueDto, QueryVenueDto } from './dto/index.js';
import { success } from '../common/helpers/api-response.helper.js';
import { CLERK_CLIENT } from '../config/clerk.config.js';
import type { ClerkClient } from '@clerk/backend';
import type { SportType } from '@dat-san-vn/types';
import {
  assertOptimisticUpdate,
  withOptimisticLock,
} from '../common/optimistic-lock.guard.js';

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
  ) {}

  /**
   * Create a venue and automatically assign the creator as OWNER.
   * VenueOwner status starts as PENDING — ADMIN must approve.
   */
  async create(userId: string, dto: CreateVenueDto) {
    const venue = await this.prisma.venue.create({
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        district: dto.district,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        images: dto.images ?? [],
        amenities: dto.amenities ?? [],
        // isActive defaults to false — ADMIN duyệt
        owners: {
          create: {
            userId,
            status: 'PENDING',
          },
        },
      },
      include: {
        owners: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    this.logger.log(`Venue created: ${venue.id} by user: ${userId}`);
    return success(venue, 'Venue created successfully', 201);
  }

  async findAll(query: QueryVenueDto) {
    const { city, district, sportType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (city) where.city = city;
    if (district) where.district = district;
    if (sportType) {
      where.fields = {
        some: { sportType: sportType as SportType, isActive: true },
      };
    }

    const [venues, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        skip,
        take: limit,
        include: {
          fields: {
            where: { isActive: true },
            select: { id: true, name: true, sportType: true },
          },
          _count: { select: { reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return success(
      {
        items: venues,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      'Venues retrieved successfully',
    );
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        owners: {
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        _count: { select: { reviews: true, bookings: true } },
      },
    });

    if (!venue || venue.deletedAt) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }

    return success(venue, 'Venue retrieved successfully');
  }

  async update(id: string, userId: string, dto: UpdateVenueDto) {
    await this.validateManagementAccess(id, userId);

    const currentVenue = await this.prisma.venue.findUniqueOrThrow({
      where: { id },
      select: { version: true },
    });

    const venue = await withOptimisticLock(async () => {
      const result = await this.prisma.venue.updateMany({
        where: { id, version: currentVenue.version, deletedAt: null },
        data: {
          ...dto,
          version: { increment: 1 },
        },
      });
      assertOptimisticUpdate(result);

      return this.prisma.venue.findUniqueOrThrow({
        where: { id },
        include: {
          fields: {
            where: { isActive: true },
            select: { id: true, name: true, sportType: true },
          },
        },
      });
    }, currentVenue.version);

    this.logger.log(`Venue updated: ${id} by user: ${userId}`);
    return success(venue, 'Venue updated successfully');
  }

  async remove(id: string, userId: string) {
    await this.validateManagementAccess(id, userId);

    const currentVenue = await this.prisma.venue.findUniqueOrThrow({
      where: { id },
      select: { version: true },
    });

    await withOptimisticLock(async () => {
      const result = await this.prisma.venue.updateMany({
        where: { id, version: currentVenue.version, deletedAt: null },
        data: {
          deletedAt: new Date(),
          isActive: false,
          version: { increment: 1 },
        },
      });
      assertOptimisticUpdate(result);
    }, currentVenue.version);

    this.logger.log(`Venue soft-deleted: ${id} by user: ${userId}`);
    return success(null, 'Venue deleted successfully');
  }

  // ── Ownership ──────────────────────────────────────────

  async requestOwnership(venueId: string, userId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId, deletedAt: null },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const existing = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new BadRequestException('Ownership request is already pending');
      }
      if (existing.status === 'APPROVED') {
        throw new BadRequestException(
          'You are already an approved owner for this venue',
        );
      }
    }

    const ownership = await this.prisma.venueOwner.upsert({
      where: { userId_venueId: { userId, venueId } },
      update: { status: 'PENDING' },
      create: { userId, venueId, status: 'PENDING' },
    });

    this.logger.log(
      `Ownership requested for venue ${venueId} by user ${userId}`,
    );
    return success(ownership, 'Ownership request submitted successfully', 201);
  }

  async approveOwnership(venueId: string, adminId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId, deletedAt: null },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const result = await this.prisma.venueOwner.updateMany({
      where: { venueId, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'No pending ownership requests found for this venue',
      );
    }

    this.logger.log(
      `Admin ${adminId} approved ${result.count} ownership(s) for venue ${venueId}`,
    );
    return success(null, 'Ownership(s) approved successfully');
  }

  async rejectOwnership(venueId: string, adminId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId, deletedAt: null },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const result = await this.prisma.venueOwner.updateMany({
      where: { venueId, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'No pending ownership requests found for this venue',
      );
    }

    this.logger.log(
      `Admin ${adminId} rejected ${result.count} ownership(s) for venue ${venueId}`,
    );
    return success(null, 'Ownership(s) rejected successfully');
  }

  async findMine(userId: string) {
    const venues = await this.prisma.venue.findMany({
      where: {
        deletedAt: null,
        owners: {
          some: {
            userId,
            status: {
              in: ['PENDING', 'APPROVED'],
            },
          },
        },
      },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            sportType: true,
            size: true,
            isActive: true,
          },
        },
        owners: {
          where: { userId },
          select: {
            status: true,
          },
        },
        _count: {
          select: {
            fields: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(venues, 'Owned venues retrieved successfully');
  }

  async validateManagementAccess(
    venueId: string,
    userId: string,
  ): Promise<void> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, deletedAt: true },
    });

    if (!venue || venue.deletedAt) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const ownership = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });

    if (!ownership || ownership.status === 'REJECTED') {
      throw new ForbiddenException(
        'You do not have permission to manage this venue',
      );
    }
  }

  /**
   * Verify that the given user is an APPROVED owner of the venue.
   * Throws ForbiddenException if not.
   */
  async validateOwnership(venueId: string, userId: string): Promise<void> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, deletedAt: true },
    });

    if (!venue || venue.deletedAt) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const ownership = await this.prisma.venueOwner.findUnique({
      where: { userId_venueId: { userId, venueId } },
    });

    if (!ownership || ownership.status !== 'APPROVED') {
      throw new ForbiddenException(
        'You are not an approved owner of this venue',
      );
    }
  }
}
