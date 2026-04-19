import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { CreateBookingDto } from './dto/index.js';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '@prisma/client';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';

@Controller('bookings')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(UserRole.PLAYER, UserRole.ADMIN, UserRole.OWNER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.bookingService.createBooking(user.id, dto);
  }

  @Get('me')
  getMyBookings(@CurrentUser() user: AuthUser) {
    return this.bookingService.getMyBookings(user.id);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  getManagedBookings(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    return this.bookingService.getManagedBookings(user.id, user.role, { status, date });
  }

  @Post(':id/confirm')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  confirmBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.confirmBooking(id, user.id);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  confirmBookingViaPatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.confirmBooking(id, user.id);
  }

  @Post(':id/cancel-by-owner')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  cancelByOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.cancelBooking(id, user.id, true);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PLAYER, UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.cancelBooking(id, user.id, user.role === UserRole.OWNER);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.PLAYER, UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  cancelBookingViaPatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingService.cancelBooking(id, user.id, user.role === UserRole.OWNER);
  }
}
