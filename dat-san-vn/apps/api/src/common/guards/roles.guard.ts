// ============================================================
// DatSanVN — Roles Guard (Skeleton)
// Check user.role từ request sau khi Auth middleware set user
// Sẽ hoạt động đầy đủ sau khi tích hợp Clerk Auth
// ============================================================

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@dat-san-vn/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không có @Roles() → cho qua
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // TODO: Auth middleware sẽ attach user vào request
    // Sau khi tích hợp Clerk, request.user sẽ có { id, role, ... }
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role: Role } | undefined;

    // Chưa có user (chưa auth) → block
    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
