import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { clerkConfig } from './config/clerk.config.js';

/**
 * AppModule — root module.
 *
 * Global singletons (available in all child modules without re-importing):
 *  - ConfigModule   → env vars + typed config namespaces via ConfigService
 *  - PrismaModule   → @Global(), PrismaService injectable everywhere
 *
 * Feature modules:
 *  - WebhooksModule → Clerk webhook at POST /webhooks/clerk
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
     * The `clerkConfig` factory validates CLERK_WEBHOOK_SECRET at startup —
     * if missing, the app will fail to boot with a clear error message.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [clerkConfig],
    }),

    // Global Prisma client — PrismaService injectable in any module
    PrismaModule,

    // Webhook handlers
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
