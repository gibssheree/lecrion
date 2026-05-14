import { Injectable, Logger } from '@nestjs/common';

/**
 * TenantsService
 *
 * Multi-tenant isolation layer.
 * Per 01-blueprint.md § Multi-Tenant Model:
 *   "Every business object must include tenant_id or store_id."
 *   "Queries are always filtered by tenant/store."
 *   "Realtime channels are namespaced per store."
 *   "Cache keys are namespaced per store."
 *
 * Current implementation: single-tenant (default) with store scoping.
 * Extend this service when a tenants table is added to the Prisma schema.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  /**
   * Validate that a tenantId is known.
   * Currently always returns true for 'default'.
   * Extend with DB lookup when multi-tenant is needed.
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    return tenantId === 'default' || tenantId?.length > 0;
  }

  /**
   * Validate that a storeId belongs to a tenant.
   * Currently always returns true.
   * Extend with DB lookup when stores table is added.
   */
  async validateStore(storeId: string, tenantId: string): Promise<boolean> {
    return storeId?.length > 0 && tenantId?.length > 0;
  }

  /**
   * Get the default store for a tenant.
   */
  getDefaultStore(tenantId = 'default'): string {
    return 'default-store';
  }

  /**
   * Build a namespaced cache key for a tenant+store.
   * Per 01-blueprint.md: "Cache keys are namespaced per store."
   */
  buildCacheKey(tenantId: string, storeId: string, key: string): string {
    return `${tenantId}:${storeId}:${key}`;
  }

  /**
   * Build a namespaced realtime channel for a store.
   * Per 01-blueprint.md: "Realtime channels are namespaced per store."
   */
  buildRealtimeChannel(storeId: string): string {
    return `store:${storeId}`;
  }

  /**
   * List all tenants (stub — extend when tenants table exists).
   */
  listTenants() {
    return [{ tenantId: 'default', name: 'Lecrion', status: 'active' }];
  }
}
