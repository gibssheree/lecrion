import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth.types';

/** Roles that may override storeId via X-Store-Id header */
const SERVICE_ROLES = new Set(['bot_service', 'worker_service', 'llm_service']);

/**
 * TenantGuard
 *
 * Resolves and enforces storeId + tenantId on every authenticated request.
 *
 * Phase 9 changes:
 *   - Human users (owner/manager/cashier/etc.) can NO LONGER override their
 *     storeId via the X-Store-Id header. Their storeId is fixed to the value
 *     embedded in their JWT at login time.
 *   - Service accounts (bot_service, worker_service, llm_service) and the
 *     dashboard API key (channel='dashboard') may still use X-Store-Id to
 *     operate across stores.
 *
 * Per 01-blueprint.md § Multi-Tenant Model:
 *   "Every business object must include tenant_id or store_id."
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    if (!user) return true; // Let JwtAuthGuard handle missing auth

    const headerStoreId = req.headers['x-store-id'] as string | undefined;
    const isServiceAccount =
      SERVICE_ROLES.has(user.role) || user.channel === 'dashboard';

    let storeId: string;

    if (isServiceAccount) {
      // Service accounts may use header override
      storeId = headerStoreId || user.storeId || 'default-store';
    } else {
      // Human users: storeId is fixed from JWT; header override is ignored
      if (headerStoreId && headerStoreId !== user.storeId) {
        this.logger.warn(
          `X-Store-Id header override blocked for human user: ` +
            `actor=${user.actor} role=${user.role} ` +
            `token_store=${user.storeId} header_store=${headerStoreId}`,
        );
        // Silently ignore the header — use token storeId
        // (don't throw — this could break legitimate clients that always send the header)
      }
      storeId = user.storeId || 'default-store';
    }

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
