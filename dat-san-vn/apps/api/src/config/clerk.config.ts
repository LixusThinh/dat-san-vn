import { registerAs } from '@nestjs/config';

/**
 * Clerk configuration namespace.
 *
 * Loaded via ConfigModule.forRoot({ load: [clerkConfig] }) in app.module.ts.
 *
 * Required ENV vars:
 *   CLERK_WEBHOOK_SECRET  — The webhook signing secret from Clerk Dashboard.
 *                           Format: whsec_xxxxxxxxxxxx...
 *                           Where to get it: Clerk Dashboard → Configure → Webhooks
 *                             → your endpoint → Signing Secret (click "Reveal").
 *
 * Usage with typed injection:
 *   constructor(@Inject(clerkConfig.KEY) private cfg: ConfigType<typeof clerkConfig>) {}
 *   this.cfg.webhookSecret
 *
 * Usage via flat ConfigService (simpler, used in service):
 *   this.configService.get<string>('clerk.webhookSecret')
 */
export const clerkConfig = registerAs('clerk', () => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      '[ClerkConfig] Missing required env var: CLERK_WEBHOOK_SECRET. ' +
        'Get it from: Clerk Dashboard → Configure → Webhooks → your endpoint → Signing Secret.',
    );
  }

  return {
    /** HMAC signing secret for Svix signature verification */
    webhookSecret,
  };
});

/** Inferred type — use with ConfigType<typeof clerkConfig> */
export type ClerkConfig = ReturnType<typeof clerkConfig>;
