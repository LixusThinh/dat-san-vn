import { Module } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth.guard.js';
import { ClerkClientProvider } from '../config/clerk-client.provider.js';

/**
 * AuthModule — provides Clerk-based JWT authentication.
 *
 * Exports:
 *  - ClerkAuthGuard    → use via @UseGuards(ClerkAuthGuard) on controllers/routes
 *  - ClerkClientProvider → use via @Inject(CLERK_CLIENT) for full Clerk API access
 *
 * Dependencies (injected automatically — no import needed):
 *  - PrismaService  → from PrismaModule (@Global)
 *  - ConfigService  → from ConfigModule (isGlobal: true)
 *  - Reflector      → from @nestjs/core (always available)
 *
 * Usage in other modules:
 *   @Module({ imports: [AuthModule] })
 *   export class SomeModule {}
 *
 *   @UseGuards(ClerkAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *   @Get('protected')
 *   protectedRoute() { ... }
 */
@Module({
  providers: [ClerkAuthGuard, ClerkClientProvider],
  exports: [ClerkAuthGuard, ClerkClientProvider],
})
export class AuthModule {}
