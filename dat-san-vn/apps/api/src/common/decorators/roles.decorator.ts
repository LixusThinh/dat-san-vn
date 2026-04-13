// ============================================================
// DatSanVN — Roles Decorator
// Dùng với RolesGuard để bảo vệ route theo role
// Roles: USER | OWNER | ADMIN (từ @dat-san-vn/types)
// ============================================================

import { SetMetadata } from '@nestjs/common';
import type { Role } from '@dat-san-vn/types';

export const ROLES_KEY = 'roles';

/**
 * Decorator đánh dấu route yêu cầu role cụ thể.
 *
 * @example
 * @Roles('ADMIN')
 * @Roles('ADMIN', 'OWNER')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
