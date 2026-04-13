// ============================================================
// DatSanVN — VenueModule
// Provides venue CRUD functionality
// ============================================================

import { Module } from '@nestjs/common';
import { VenueController } from './venue.controller.js';
import { VenueService } from './venue.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VenueController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
