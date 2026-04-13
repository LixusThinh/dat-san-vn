import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk/clerk-webhook.controller.js';
import { ClerkWebhookService } from './clerk/clerk-webhook.service.js';

/**
 * WebhooksModule
 *
 * Aggregates all inbound webhook handlers for the application.
 *
 * Currently handles:
 *  - Clerk user lifecycle events → POST /webhooks/clerk
 *
 * Notes on global dependencies (no need to import here):
 *  - PrismaService  → provided by PrismaModule (@Global)
 *  - ConfigService  → provided by ConfigModule (isGlobal: true)
 *
 * To add new webhook providers in the future (e.g. Stripe):
 *  1. Create apps/api/src/webhooks/stripe/ with controller + service
 *  2. Add them to controllers[] and providers[] here
 */
@Module({
  controllers: [ClerkWebhookController],
  providers: [ClerkWebhookService],
})
export class WebhooksModule {}
