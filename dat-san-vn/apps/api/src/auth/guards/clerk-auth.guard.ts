import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

/**
 * ClerkAuthGuard — verifies Clerk JWT tokens and attaches AuthUser to request.
 *
 * Flow:
 *  1. Check for @Public() metadata → skip if present
 *  2. Extract Bearer token from Authorization header
 *  3. Verify token using Clerk's `verifyToken()` from @clerk/backend
 *  4. Look up user in our DB by Clerk's `sub` claim (= clerkId)
 *  5. Attach AuthUser to `req.user`
 *  6. Throw UnauthorizedException on any failure
 *
 * Usage:
 *   @UseGuards(ClerkAuthGuard)           // single route
 *   @UseGuards(ClerkAuthGuard, RolesGuard) // with role check
 *
 * The guard does NOT modify the token — it only reads and verifies.
 * It's idempotent and stateless (no session, no cookies).
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private readonly secretKey: string;
  private readonly jwtKey: string | undefined;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Use namespaced config — validated at startup by clerkConfig factory
    const key = this.configService.get<string>('clerk.secretKey');

    if (!key) {
      throw new Error(
        '[ClerkAuthGuard] Missing clerk.secretKey config. ' +
          'Ensure CLERK_SECRET_KEY is set in .env and clerkConfig is loaded.',
      );
    }

    this.secretKey = key;
    this.jwtKey = this.configService.get<string>('clerk.jwtKey');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ── Step 1: Check @Public() decorator ──────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // ── Step 2: Extract Bearer token ───────────────────────────────────────
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined =
      request.headers?.authorization ?? undefined;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException(
        'Missing Authorization header. Expected: Bearer <token>',
      );
    }

    const trimmed = authHeader.trim();

    if (!trimmed.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: Bearer <token>',
      );
    }

    const token = trimmed.slice(7).trim();

    if (!token) {
      throw new UnauthorizedException('Empty token in Authorization header');
    }

    // ── Step 3: Verify Clerk JWT ───────────────────────────────────────────
    let clerkUserId: string;

    try {
      /**
       * verifyToken() from @clerk/backend:
       *  - Validates JWT signature against Clerk's JWKS
       *  - Checks expiration, issuer, audience
       *  - Returns decoded payload with `sub` = Clerk user ID
       *
       * The secretKey is used to fetch the JWKS from Clerk's API.
       */
      const payload = await verifyToken(token, {
        // Prefer jwtKey (local PEM verification, no network call)
        // Fall back to secretKey (fetches JWKS from Clerk API)
        ...(this.jwtKey ? { jwtKey: this.jwtKey } : { secretKey: this.secretKey }),
      });

      clerkUserId = payload.sub;

      if (!clerkUserId) {
        throw new Error('JWT payload missing `sub` claim');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown verification error';

      this.logger.warn(`[Auth] JWT verification failed: ${message}`);

      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }

    // ── Step 4: Look up user in our database ───────────────────────────────
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      this.logger.warn(
        `[Auth] Clerk user ${clerkUserId} not found in database. ` +
          'User may not have been synced via webhook yet.',
      );
      throw new UnauthorizedException(
        'User not found. Please wait for account sync or contact support.',
      );
    }

    if (!user.isActive) {
      this.logger.warn(
        `[Auth] Inactive user attempted access: ${user.id} (clerkId=${clerkUserId})`,
      );
      throw new UnauthorizedException('Account has been deactivated');
    }

    // ── Step 5: Attach AuthUser to request ─────────────────────────────────
    const authUser: AuthUser = {
      id: user.id,
      clerkId: user.clerkId ?? clerkUserId,
      email: user.email,
      role: user.role,
    };

    request.user = authUser;

    this.logger.debug(
      `[Auth] Authenticated: ${authUser.email} (role=${authUser.role})`,
    );

    return true;
  }
}
