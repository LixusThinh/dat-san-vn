import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Webhook } from 'svix';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';
import {
  type ClerkUserData,
  type ClerkDeletedData,
  type SupportedClerkEvent,
  type ClerkUserCreatedEvent,
  type ClerkUserUpdatedEvent,
  type ClerkUserDeletedEvent,
  isSupportedClerkEvent,
} from './dto/index.js';

/**
 * ClerkWebhookService
 *
 * Handles all business logic for Clerk webhook events.
 *
 * Architecture:
 *  - verifySignature(): uses Svix to verify HMAC-SHA256 + timestamp
 *  - handleEvent(): routes to per-event handler using discriminated union
 *  - All DB operations are idempotent (upsert, not insert)
 *
 * Design decisions:
 *  - verifySignature() throws on invalid; controller catches and returns 200
 *    (Clerk retries on non-2xx, so we must swallow errors at controller level)
 *  - user.deleted is a SOFT delete — keeps DB row for FK integrity
 *  - Role is never overwritten on update (managed by our own admin flows)
 *
 * Svix verification requires:
 *  - Raw body as Buffer or string (NOT parsed JSON)
 *  - Three headers: svix-id, svix-timestamp, svix-signature
 *  - A clock within 5 minutes of the timestamp header (anti-replay)
 */
@Injectable()
export class ClerkWebhookService {
  private readonly logger = new Logger(ClerkWebhookService.name);

  /**
   * Svix Webhook instance — initialized once with the signing secret.
   * Reused for every incoming request (stateless, thread-safe).
   */
  private readonly webhook: Webhook;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    /**
     * Pull secret from ConfigService.
     *
     * Works with either:
     *   - Flat env var:      configService.get<string>('CLERK_WEBHOOK_SECRET')
     *   - Namespaced config: configService.get<string>('clerk.webhookSecret')
     *     (requires clerkConfig loaded in ConfigModule.forRoot({ load: [clerkConfig] }))
     *
     * We use the flat key for simplicity — both map to the same env var.
     */
    const secret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!secret) {
      throw new Error(
        '[ClerkWebhookService] Missing CLERK_WEBHOOK_SECRET env var. ' +
          'Set it in .env: CLERK_WEBHOOK_SECRET=whsec_xxxx...\n' +
          'Find it at: Clerk Dashboard → Configure → Webhooks → your endpoint → Signing Secret.',
      );
    }

    // Svix Webhook instance wraps HMAC-SHA256 verification + replay attack protection.
    // The secret MUST be the raw "whsec_..." string from Clerk (Svix decodes it internally).
    this.webhook = new Webhook(secret);
  }

  // ─── Signature Verification ────────────────────────────────────────────────

  /**
   * Verifies the Clerk webhook signature using the Svix library.
   *
   * HOW SVIX VERIFICATION WORKS:
   *  1. Extracts three required headers: svix-id, svix-timestamp, svix-signature
   *  2. Recomputes HMAC-SHA256( svix-id + "." + svix-timestamp + "." + rawBody )
   *  3. Compares to the `svix-signature` header value (base64url encoded)
   *  4. Checks timestamp is within ±5 minutes to prevent replay attacks
   *
   *  ⚠️  rawBody MUST be the original Buffer/string from the HTTP request.
   *      A re-serialized JSON would produce a different hash → verification fails.
   *
   * @param rawBody  Raw Buffer from Express (populated by rawBody:true in main.ts)
   * @param headers  Full request headers (svix-id/timestamp/signature are extracted here)
   * @returns        Verified, parsed SupportedClerkEvent — safe to use
   * @throws         WebhookVerificationError if signature/timestamp is invalid
   */
  verifySignature(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): SupportedClerkEvent {
    /**
     * Extract the three Svix-specific headers required for verification.
     * Headers from NestJS @Headers() may be arrays (multi-value); take the first.
     */
    const svixId = this.extractHeader(headers, 'svix-id');
    const svixTimestamp = this.extractHeader(headers, 'svix-timestamp');
    const svixSignature = this.extractHeader(headers, 'svix-signature');

    this.logger.debug(
      `[Verify] svix-id=${svixId} svix-timestamp=${svixTimestamp}`,
    );

    // Svix verify() throws WebhookVerificationError on any failure.
    // It returns the parsed payload as `object` — we must narrow the type ourselves.
    const payload: unknown = this.webhook.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    /**
     * Runtime type guard: ensure Svix returned a shape we actually handle.
     * This catches unknown event types (e.g. organization.created) that Clerk
     * might send if the webhook endpoint is misconfigured to receive all events.
     */
    if (!isSupportedClerkEvent(payload)) {
      const eventType =
        typeof payload === 'object' && payload !== null
          ? String((payload as Record<string, unknown>)['type'] ?? 'unknown')
          : 'non-object';

      throw new Error(
        `[Verify] Unsupported or malformed event type: "${eventType}". ` +
          'Only user.created, user.updated, user.deleted are handled.',
      );
    }

    this.logger.log(`[Verify] Signature OK — event type: ${payload.type}`);
    return payload;
  }

  // ─── Event Routing ─────────────────────────────────────────────────────────

  /**
   * Routes a verified Clerk event to the appropriate handler.
   *
   * Uses TypeScript discriminated union narrowing — after checking `event.type`,
   * TypeScript knows the exact shape of `event.data` without any cast.
   */
  async handleEvent(event: SupportedClerkEvent): Promise<void> {
    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event);
        break;

      case 'user.updated':
        await this.handleUserUpdated(event);
        break;

      case 'user.deleted':
        await this.handleUserDeleted(event);
        break;

      default: {
        // Exhaustiveness check — unreachable with correct SupportedClerkEvent union
        const _exhaustiveCheck: never = event;
        this.logger.warn(
          `[handleEvent] Unhandled event type: ${String((_exhaustiveCheck as SupportedClerkEvent).type)}`,
        );
      }
    }
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /**
   * user.created — Upsert user into our database.
   *
   * IDEMPOTENCY: Uses `upsert` with `clerkId` as the unique key.
   * Replaying this event (Clerk retries on network errors) will not
   * create duplicates — it will update the existing record instead.
   *
   * Default role = USER. Role is only changed via our admin flows.
   *
   * @param event  Narrowed ClerkUserCreatedEvent (data is ClerkUserData)
   */
  private async handleUserCreated(event: ClerkUserCreatedEvent): Promise<void> {
    const data: ClerkUserData = event.data;
    const email = this.extractPrimaryEmail(data);

    if (!email) {
      this.logger.warn(
        `[user.created] No primary email for clerkId=${data.id}. ` +
          'User cannot be created without an email. Skipping.',
      );
      return;
    }

    try {
      const user = await this.prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email,
          fullName: this.buildFullName(data),
          phone: this.extractPrimaryPhone(data) ?? undefined,
          avatarUrl: data.image_url ?? undefined,
          role: Role.USER,   // Default role — do NOT change on replay
          isActive: true,
        },
        update: {
          // On replay: sync profile data but preserve role and isActive
          email,
          fullName: this.buildFullName(data),
          avatarUrl: data.image_url ?? undefined,
          // Phone update only if available — avoid overwriting with null
          ...(this.extractPrimaryPhone(data) !== null && {
            phone: this.extractPrimaryPhone(data) ?? undefined,
          }),
          isActive: true,
        },
      });

      this.logger.log(
        `[user.created] Upserted → id=${user.id} clerkId=${data.id} email=${email}`,
      );
    } catch (error) {
      this.logger.error(
        `[user.created] Failed to upsert clerkId=${data.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error; // Re-throw → controller logs but still returns HTTP 200
    }
  }

  /**
   * user.updated — Sync profile changes from Clerk to our DB.
   *
   * IDEMPOTENCY: Uses `upsert` — if user somehow doesn't exist, creates it.
   * SAFETY: Does NOT overwrite `role` or `isActive` — those are our domain.
   *
   * Fields synced: email, fullName, avatarUrl, phone
   *
   * @param event  Narrowed ClerkUserUpdatedEvent (data is ClerkUserData)
   */
  private async handleUserUpdated(event: ClerkUserUpdatedEvent): Promise<void> {
    const data: ClerkUserData = event.data;
    const email = this.extractPrimaryEmail(data);
    const phone = this.extractPrimaryPhone(data);

    try {
      const user = await this.prisma.user.upsert({
        where: { clerkId: data.id },
        create: {
          // Safety fallback: create user if it doesn't exist yet
          clerkId: data.id,
          email: email ?? `clerk_${data.id}@placeholder.invalid`,
          fullName: this.buildFullName(data),
          phone: phone ?? undefined,
          avatarUrl: data.image_url ?? undefined,
          role: Role.USER,
          isActive: true,
        },
        update: {
          // Only update fields managed by Clerk; preserve role, isActive
          ...(email && { email }),
          fullName: this.buildFullName(data),
          avatarUrl: data.image_url ?? undefined,
          ...(phone !== null && { phone }),
        },
      });

      this.logger.log(
        `[user.updated] Synced → id=${user.id} clerkId=${data.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[user.updated] Failed for clerkId=${data.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * user.deleted — Soft-delete the user in our DB (set isActive = false).
   *
   * WHY SOFT DELETE:
   *  Hard-deleting breaks FK references in bookings, reviews, etc.
   *  Soft delete preserves history while marking the user as inactive.
   *
   * IDEMPOTENCY: If user not found, we log and return — nothing to do.
   *
   * @param event  Narrowed ClerkUserDeletedEvent (data is ClerkDeletedData)
   */
  private async handleUserDeleted(event: ClerkUserDeletedEvent): Promise<void> {
    const data: ClerkDeletedData = event.data;

    try {
      // Check existence first to give a meaningful log message
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId: data.id },
        select: { id: true, isActive: true },
      });

      if (!existingUser) {
        this.logger.warn(
          `[user.deleted] User not found for clerkId=${data.id}. ` +
            'Either already deleted or was never synced. No action taken.',
        );
        return;
      }

      if (!existingUser.isActive) {
        // Already soft-deleted — idempotent, nothing to do
        this.logger.log(
          `[user.deleted] User id=${existingUser.id} already inactive. Skipping.`,
        );
        return;
      }

      await this.prisma.user.update({
        where: { clerkId: data.id },
        data: { isActive: false },
      });

      this.logger.log(
        `[user.deleted] Soft-deleted → id=${existingUser.id} clerkId=${data.id}`,
      );
    } catch (error) {
      this.logger.error(
        `[user.deleted] Failed for clerkId=${data.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Extracts the primary email string from ClerkUserData.
   * Returns null if no primary email is set or it cannot be found.
   */
  private extractPrimaryEmail(data: ClerkUserData): string | null {
    if (!data.primary_email_address_id) return null;

    const emailObj = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );

    return emailObj?.email_address ?? null;
  }

  /**
   * Extracts the primary phone number string from ClerkUserData.
   * Returns null if no primary phone is set or it cannot be found.
   */
  private extractPrimaryPhone(data: ClerkUserData): string | null {
    if (!data.primary_phone_number_id) return null;

    const phoneObj = data.phone_numbers.find(
      (p) => p.id === data.primary_phone_number_id,
    );

    return phoneObj?.phone_number ?? null;
  }

  /**
   * Builds a display name from Clerk first_name + last_name.
   * Falls back to 'Unknown' if both are null/empty.
   */
  private buildFullName(data: ClerkUserData): string {
    const parts = [data.first_name, data.last_name].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    );
    return parts.length > 0 ? parts.join(' ') : 'Unknown';
  }

  /**
   * Safely extracts a single string value from a raw header.
   *
   * NestJS @Headers() returns headers as Record<string, string | string[] | undefined>.
   * Multi-value headers (rare, but possible) come as arrays — we take the first.
   * Missing headers return '' — Svix will then fail verification with a clear error.
   */
  private extractHeader(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string {
    const value = headers[key];
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
  }
}
