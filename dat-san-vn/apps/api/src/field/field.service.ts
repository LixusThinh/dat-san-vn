// ============================================================
// DatSanVN — FieldService
// CRUD operations for fields (sân con) within a venue
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFieldDto, UpdateFieldDto } from './dto/index.js';
import { success } from '../common/helpers/api-response.helper.js';
import { VenueService } from '../venue/venue.service.js';
import {
  assertOptimisticUpdate,
  withOptimisticLock,
} from '../common/optimistic-lock.guard.js';

@Injectable()
export class FieldService {
  private readonly logger = new Logger(FieldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly venueService: VenueService,
  ) {}

  async create(venueId: string, userId: string, dto: CreateFieldDto) {
    await this.venueService.validateManagementAccess(venueId, userId);

    const field = await this.prisma.field.create({
      data: {
        venueId,
        name: dto.name,
        sportType: dto.sportType,
        size: dto.size,
      },
    });

    this.logger.log(`Field created: ${field.id} in venue: ${venueId}`);
    return success(field, 'Field created successfully', 201);
  }

  async findByVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, deletedAt: true },
    });

    if (!venue || venue.deletedAt) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    const fields = await this.prisma.field.findMany({
      where: { venueId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { slots: true } },
      },
    });

    return success(fields, 'Fields retrieved successfully');
  }

  async findOne(id: string) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            district: true,
          },
        },
        _count: { select: { slots: true } },
      },
    });

    if (!field || !field.isActive) {
      throw new NotFoundException(`Field with ID "${id}" not found`);
    }

    return success(field, 'Field retrieved successfully');
  }

  async update(id: string, userId: string, dto: UpdateFieldDto) {
    const field = await this.getFieldOrFail(id);
    await this.venueService.validateManagementAccess(field.venueId, userId);

    const updated = await withOptimisticLock(async () => {
      const result = await this.prisma.field.updateMany({
        where: { id, version: field.version, isActive: true },
        data: { ...dto, version: { increment: 1 } },
      });
      assertOptimisticUpdate(result);

      return this.prisma.field.findUniqueOrThrow({
        where: { id },
      });
    }, field.version);

    this.logger.log(`Field updated: ${id} by user: ${userId}`);
    return success(updated, 'Field updated successfully');
  }

  async remove(id: string, userId: string) {
    const field = await this.getFieldOrFail(id);
    await this.venueService.validateManagementAccess(field.venueId, userId);

    await withOptimisticLock(async () => {
      const result = await this.prisma.field.updateMany({
        where: { id, version: field.version, isActive: true },
        data: { isActive: false, version: { increment: 1 } },
      });
      assertOptimisticUpdate(result);
    }, field.version);

    this.logger.log(`Field deactivated: ${id} by user: ${userId}`);
    return success(null, 'Field deleted successfully');
  }

  // Add available slots method
  async getAvailableSlots(fieldId: string, dateStr: string) {
    const field = await this.getFieldOrFail(fieldId);

    let dateQuery: Date;
    if (dateStr) {
      dateQuery = new Date(dateStr);
      if (isNaN(dateQuery.getTime())) {
        throw new BadRequestException('Invalid date format');
      }
    } else {
      // Default to today
      dateQuery = new Date();
      dateQuery.setHours(0, 0, 0, 0);
    }

    const slots = await this.prisma.venueSlot.findMany({
      where: {
        fieldId,
        date: dateQuery,
        status: 'AVAILABLE',
      },
      orderBy: { startTime: 'asc' },
    });

    return success(slots, 'Available time slots retrieved successfully');
  }

  private async getFieldOrFail(id: string) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      select: { id: true, venueId: true, isActive: true, version: true },
    });

    if (!field || !field.isActive) {
      throw new NotFoundException(`Field with ID "${id}" not found`);
    }

    return field;
  }
}
