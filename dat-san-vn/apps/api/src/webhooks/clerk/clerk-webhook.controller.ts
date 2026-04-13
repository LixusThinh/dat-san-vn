import {
  Controller,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ClerkWebhookService } from './clerk-webhook.service.js';
import { RawBody } from '../../common/decorators/raw-body.decorator.js';
import type { SupportedClerkEvent } from './dto/index.js';

/**
 * ClerkWebhookController
 *
 * Exposes: POST /webhooks/clerk
 *
 * Request flow:
 *  1. Extract raw body Buffer  → required for Svix HMAC-SHA256 verification
 *  2. Verify Svix signature    → reject (but still 200) if invalid
 *  3. Route to service handler → upsert/delete user in DB
 *  4. Always return HTTP 200   → Clerk retries on anything else (avoid retry storms)
 *
 * Route registration:
 *  - Global prefix 'api' is set in main.ts
 *  - The prefix excludes 'webhooks/(.*)' so this endpoint is at /webhooks/clerk
 *    NOT /api/webhooks/clerk
 *
 * Authentication:
 *  - No JWT/session guard needed — Svix HMAC signature IS the auth
 *  - Invalid signatures are logged and swallowed (return 200, received: false)
 *
 * Why always 200?
 *  - Clerk retries delivery for any non-2xx response up to 5 times
 *  - A processing error on our end (DB down, etc.) should not trigger retries
 *  - Instead we log the error for alerting/manual investigation
 */
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(private readonly clerkWebhookService: ClerkWebhookService) {}

  /**
   * POST /webhooks/clerk
   *
   * @param rawBody  Raw request body Buffer — populated by `rawBody: true` in main.ts
   * @param headers  All request headers — Svix requires svix-id, svix-timestamp, svix-signature
   * @returns        { received: boolean; message?: string }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @RawBody() rawBody: Buffer | null,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: boolean; message?: string }> {
    // ── Guard: raw body must be a Buffer for Svix to verify ────────────────
    if (!rawBody) {
      this.logger.error(
        '[Webhook] Raw body is null — rawBody: true may not be set in NestFactory.create().',
      );
      // Return 200 even here to prevent Clerk retry loop; this is a server misconfiguration
      return { received: false, message: 'Server misconfiguration: raw body unavailable' };
    }

    // ── Step 1: Verify Svix signature ──────────────────────────────────────
    let event: SupportedClerkEvent;

    try {
      /**
       * verifySignature() uses Svix to:
       *  a) Recompute HMAC-SHA256 over (svix-id + "." + svix-timestamp + "." + rawBody)
       *  b) Compare to svix-signature header
       *  c) Validate timestamp is within ±5 minutes (anti-replay)
       *
       * Throws WebhookVerificationError on any failure.
       */
      event = this.clerkWebhookService.verifySignature(rawBody, headers);
    } catch (error) {
      // Signature invalid, expired, or wrong secret → not a legitimate Clerk request
      this.logger.warn(
        '[Webhook] Signature verification failed. Discarding event.',
        error instanceof Error ? error.message : String(error),
      );

      // Return 200 to prevent Clerk from retrying — the request is simply invalid
      return { received: false, message: 'Signature verification failed' };
    }

    this.logger.log(`[Webhook] Verified event: ${event.type} at ${new Date().toISOString()}`);

    // ── Step 2: Handle the event ───────────────────────────────────────────
    try {
      await this.clerkWebhookService.handleEvent(event);

      this.logger.log(`[Webhook] Successfully processed: ${event.type}`);
      return { received: true };
    } catch (error) {
      /**
       * Handler failed (e.g. DB error, Prisma timeout).
       *
       * Clerk best practice: return 200 to prevent retry loop.
       * Log the error for alerts/manual investigation instead.
       *
       * If you want Clerk to retry on DB errors, return 500 here — but be aware
       * that Clerk will retry up to 5 times with exponential backoff.
       */
      this.logger.error(
        `[Webhook] Handler failed for event "${event.type}". ` +
          'Returning 200 to prevent Clerk retry loop. Check logs for manual action.',
        error instanceof Error ? error.stack : String(error),
      );

      return {
        received: true,
        message: `Event "${event.type}" received but processing failed — check server logs`,
      };
    }
  }
}
