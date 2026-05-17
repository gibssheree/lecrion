// apps/api/src/common/guards/store-scope.guard.ts
//
// StoreScopeGuard
//
// Prevents cross-store data access for human users.
//
// Rules:
//   - Service accounts (bot_service, worker_service, llm_service) are exempt —
//     they operate across stores by design.
//   - dashboard service account (manager role via API key) is also exempt.
//   - Human users (owner, manager, cashier, inventory_staff, support) must
//     only access their own store's data.
//   - The effective storeId is resolved by TenantGuard and stored on req.storeId.
//   - If req.storeId !== user.storeId, the request is rejected with 403.
//
// Usage: apply after JwtAuthGuard + TenantGuard on any controller that
// handles store-scoped data.
//
//   @UseGuards(JwtAuthGuard, RolesGuard, StoreScopeGuard)
//
// Or globally — but currently applied per-controller to avoid breaking
// service-to-service flows that legitimately cross stores.

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuthUser } from '../../modules/auth/auth.types';

/** Roles that are exempt from store-scope enforcement */
const SERVICE_ROLES = new Set([
  'bot_service',
  'worker_service',
  'llm_service',
  'worker_service',
]);

@Injectable()
export class StoreScopeGuard implements CanActivate {
  private readonly logger = new Logger(StoreScopeGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    // No user = JwtAuthGuard will handle it
    if (!user) return true;

    // Service accounts are exempt
    if (SERVICE_ROLES.has(user.role)) return true;

    // dashboard API key comes in as 'manager' role — also exempt
    // (it's a service-to-service call, not a human user)
    if (user.channel === 'dashboard') return true;

    // Resolve effective storeId (set by TenantGuard)
    const effectiveStoreId: string =
      req.storeId ?? user.storeId ?? 'default-store';

    // Human user: effective storeId must match token storeId
    if (effectiveStoreId !== user.storeId) {
      this.logger.warn(
        `Cross-store access denied: actor=${user.actor} role=${user.role} ` +
          `token_store=${user.storeId} requested_store=${effectiveStoreId}`,
      );
      throw new ForbiddenException(
        `Access denied: your account belongs to store '${user.storeId}', ` +
          `not '${effectiveStoreId}'`,
      );
    }

    return true;
  }
}
