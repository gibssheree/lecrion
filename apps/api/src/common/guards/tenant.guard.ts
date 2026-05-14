import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth.types';

/**
 * TenantGuard
 *
 * Ensures every authenticated request has a valid storeId and tenantId.
 * Injects them into the request for downstream use.
 *
 * Per 01-blueprint.md § Multi-Tenant Model:
 *   "Every business object must include tenant_id or store_id."
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser = req.user;

    if (!user) return true; // Let JwtAuthGuard handle missing auth

    // Resolve storeId: header override > token claim > default
    const storeId =
      (req.headers['x-store-id'] as string) || user.storeId || 'default-store';

    const tenantId = user.tenantId || 'default';

    if (!storeId || !tenantId) {
      throw new ForbiddenException('Missing store or tenant context');
    }

    // Attach resolved context to request for controllers/services
    req.storeId = storeId;
    req.tenantId = tenantId;

    return true;
  }
}
