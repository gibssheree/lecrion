import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

/**
 * StoresService
 *
 * Manages store-level settings and configuration.
 *
 * Schema note: the current `store_settings` table uses a flat key-value model
 * with no `store_id` column (single-store SQLite schema).
 * We namespace keys as `{storeId}:{key}` so multiple stores can coexist in
 * the same table without a schema migration.
 * When the schema gains a proper `store_id` column (P8-2), remove the prefix
 * logic and add a WHERE clause instead.
 *
 * Per 01-blueprint.md § Multi-Tenant Model:
 *   "Every business object must include tenant_id or store_id."
 */
@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Build the namespaced DB key for a store setting. */
  private dbKey(storeId: string, key: string): string {
    // Avoid double-prefixing if the key already carries the storeId prefix
    if (key.startsWith(`${storeId}:`)) return key;
    return `${storeId}:${key}`;
  }

  /**
   * Get all settings for a store.
   * Returns keys WITHOUT the storeId prefix so callers see clean names.
   */
  async getSettings(
    storeId = 'default-store',
  ): Promise<Record<string, string>> {
    const prefix = `${storeId}:`;
    const rows = await this.prisma.store_settings.findMany({
      where: { key: { startsWith: prefix } },
    });
    const result: Record<string, string> = {};
    for (const row of rows) {
      const cleanKey = row.key.startsWith(prefix)
        ? row.key.slice(prefix.length)
        : row.key;
      result[cleanKey] = row.value;
    }
    return result;
  }

  /**
   * Get a single setting value for a store.
   */
  async getSetting(
    key: string,
    defaultValue = '',
    storeId = 'default-store',
  ): Promise<string> {
    const row = await this.prisma.store_settings.findUnique({
      where: { key: this.dbKey(storeId, key) },
    });
    return row?.value ?? defaultValue;
  }

  /**
   * Set a single setting value (upsert) for a store.
   */
  async setSetting(
    key: string,
    value: string,
    storeId = 'default-store',
  ): Promise<void> {
    const dbKey = this.dbKey(storeId, key);
    const now = new Date().toISOString();
    await this.prisma.store_settings.upsert({
      where: { key: dbKey },
      update: { value, updated_at: now },
      create: { key: dbKey, value, updated_at: now },
    });
    this.logger.log(`Store setting updated: ${key} [store=${storeId}]`);
  }

  /**
   * Set multiple settings at once for a store.
   */
  async setSettings(
    settings: Record<string, string>,
    storeId = 'default-store',
  ): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all(
      Object.entries(settings).map(([key, value]) => {
        const dbKey = this.dbKey(storeId, key);
        return this.prisma.store_settings.upsert({
          where: { key: dbKey },
          update: { value, updated_at: now },
          create: { key: dbKey, value, updated_at: now },
        });
      }),
    );
    this.logger.log(
      `Store settings updated: ${Object.keys(settings).join(', ')} [store=${storeId}]`,
    );
  }

  /**
   * Delete a setting for a store.
   */
  async deleteSetting(key: string, storeId = 'default-store'): Promise<void> {
    await this.prisma.store_settings
      .delete({ where: { key: this.dbKey(storeId, key) } })
      .catch(() => {});
  }

  /**
   * Get store info.
   * NOTE: There is no `stores` table in the current schema.
   * This returns a synthetic object from config until a stores table is added (P8-2).
   */
  getStoreInfo(storeId = 'default-store') {
    return {
      storeId,
      name: 'Lecrion',
      tenantId: 'default',
      status: 'active',
    };
  }
}
