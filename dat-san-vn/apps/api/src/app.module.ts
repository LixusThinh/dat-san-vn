import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { VenueModule } from './venue/venue.module.js';
import { FieldModule } from './field/field.module.js';
import { BookingModule } from './booking/booking.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UserModule } from './user/user.module.js';
import { clerkConfig } from './config/clerk.config.js';

/**
 * AppModule — root module.
 *
 * Global singletons (available in all child modules without re-importing):
 *  - ConfigModule   → env vars + typed config namespaces via ConfigService
 *  - PrismaModule   → @Global(), PrismaService injectable everywhere
 *
 * Feature modules:
 *  - AuthModule     → ClerkAuthGuard for JWT verification
 *  - UserModule     → User CRUD at /api/users
 *  - WebhooksModule → Clerk webhook at POST /webhooks/clerk
 *  - VenueModule    → Venue CRUD at /api/venues
 *  - FieldModule    → Field CRUD at /api/venues/:id/fields + /api/fields/:id
 *  - BookingModule  → Booking logic at /api/bookings
 */
@Module({
  imports: [
    /**
     * ConfigModule.forRoot() — loads env vars globally.
     *
     * load: [clerkConfig] registers the 'clerk' namespace so you can use:
     *   configService.get<string>('clerk.webhookSecret')
     * AND the flat key still works:
     *   configService.get<string>('CLERK_WEBHOOK_SECRET')
     *
     * The `clerkConfig` factory validates CLERK_WEBHOOK_SECRET,
     * CLERK_SECRET_KEY, and CLERK_PUBLISHABLE_KEY at startup —
     * if any are missing, the app will fail to boot with a clear error message.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [clerkConfig],
    }),

    // Global Prisma client — PrismaService injectable in any module
    PrismaModule,

    // Authentication
    AuthModule,

    // User management
    UserModule,

    // Webhook handlers
    WebhooksModule,

    // Core business modules
    VenueModule,
    FieldModule,
    BookingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
