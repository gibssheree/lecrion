import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/auth/auth.types';

export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — restrict a route to specific user roles.
 *
 * Usage:
 *   @Roles('owner', 'manager')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('admin-only')
 *   adminRoute() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
