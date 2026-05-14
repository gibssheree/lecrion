import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, AuthUser } from '../../modules/auth/auth.types';

/**
 * RolesGuard
 *
 * Enforces @Roles(...) decorator on routes.
 * Must be used AFTER JwtAuthGuard (req.user must be populated).
 *
 * Per 05-security-ops.md § Permission Model.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator — allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthUser = req.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(
        `Role denied: actor=${user.actor} role=${user.role} required=[${requiredRoles.join(',')}]`,
      );
      throw new ForbiddenException(
        `Role '${user.role}' is not allowed. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
