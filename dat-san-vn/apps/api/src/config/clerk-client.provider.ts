import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type ClerkClient } from '@clerk/backend';

/**
 * Injection token for the Clerk Backend SDK client.
 *
 * Usage:
 *   @Inject(CLERK_CLIENT) private readonly clerk: ClerkClient
 *
 * Provides access to the full Clerk API:
 *   - clerk.users.getUser(userId)
 *   - clerk.users.getUserList()
 *   - clerk.organizations.getOrganization(orgId)
 *   etc.
 *
 * Unlike `verifyToken()` (which only validates JWTs), the ClerkClient
 * allows fetching full user profiles, updating metadata, and more.
 */
export const CLERK_CLIENT = 'CLERK_CLIENT';

/**
 * Factory provider for ClerkClient — uses ConfigService to read secretKey
 * from the 'clerk' config namespace (validated at startup by clerkConfig).
 *
 * Registered in AuthModule and exported for use in any importing module.
 */
export const ClerkClientProvider: Provider = {
  provide: CLERK_CLIENT,
  useFactory: (configService: ConfigService): ClerkClient => {
    const secretKey = configService.get<string>('clerk.secretKey');
    const publishableKey = configService.get<string>('clerk.publishableKey');

    if (!secretKey) {
      throw new Error(
        '[ClerkClientProvider] Missing clerk.secretKey. ' +
          'Ensure CLERK_SECRET_KEY is set in .env and clerkConfig is loaded.',
      );
    }

    return createClerkClient({
      secretKey,
      publishableKey,
    });
  },
  inject: [ConfigService],
};

/** Re-export the type for convenient use in services */
export type { ClerkClient } from '@clerk/backend';
