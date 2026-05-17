import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  BusinessVertical,
  BusinessVerticalValue,
  CORE_MODULES,
  PlatformModuleValue,
  StoreCapabilitiesResponse,
  StoreVerificationStatus,
  StoreVerificationStatusValue,
  VERTICAL_MODULES,
} from '@libs/contracts/src/modules';

// ── Calculation policy setting keys ──────────────────────────────────────────
// Duplicated here to break the circular import:
//   StoresService ← PosCalculationService ← StoresService
// The canonical definition lives in pos-calculation.service.ts.
// Both must stay in sync — if you rename a key, update both files.
const CALC_POLICY_KEYS = {
  TAX_RATE: 'calc.tax_rate',
  SERVICE_CHARGE_RATE: 'calc.service_charge_rate',
  TAX_MODE: 'calc.tax_mode',
  DISCOUNT_MAX_WITHOUT_APPROVAL: 'calc.discount_max_without_approval',
} as const;

const BUSINESS_TYPES = [
  'retail',
  'restaurant',
  'cafe',
  'service',
  'general',
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number];

const DEFAULT_BUSINESS_TYPE: BusinessType = 'general';

function normalizeBusinessType(value?: string): BusinessType {
  return BUSINESS_TYPES.includes(value as BusinessType)
    ? (value as BusinessType)
    : DEFAULT_BUSINESS_TYPE;
}

const BUSINESS_TYPE_TO_VERTICAL: Record<string, BusinessVerticalValue> = {
  general: BusinessVertical.GENERAL,
  retail: BusinessVertical.RETAIL,
  restaurant: BusinessVertical.RESTAURANT_CAFE,
  cafe: BusinessVertical.RESTAURANT_CAFE,
  service: BusinessVertical.SERVICE_REPAIR,
  grocery_minimarket: BusinessVertical.GROCERY_MINIMARKET,
  restaurant_cafe: BusinessVertical.RESTAURANT_CAFE,
  wholesale_distribution: BusinessVertical.WHOLESALE_DISTRIBUTION,
  warehouse_logistics: BusinessVertical.WAREHOUSE_LOGISTICS,
  manufacturing: BusinessVertical.MANUFACTURING,
  construction_materials: BusinessVertical.CONSTRUCTION_MATERIALS,
  service_repair: BusinessVertical.SERVICE_REPAIR,
  health_wellness: BusinessVertical.HEALTH_WELLNESS,
};

function normalizeBusinessVertical(value?: string): BusinessVerticalValue {
  return BUSINESS_TYPE_TO_VERTICAL[value ?? ''] ?? BusinessVertical.GENERAL;
}

function normalizeVerificationStatus(
  value?: string,
): StoreVerificationStatusValue {
  return Object.values(StoreVerificationStatus).includes(
    value as StoreVerificationStatusValue,
  )
    ? (value as StoreVerificationStatusValue)
    : StoreVerificationStatus.UNVERIFIED;
}

type StoreBusinessProfileRow = {
  store_id?: string;
  requested_business_vertical: string | null;
  verified_business_vertical: string;
  verification_status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ModuleRow = {
  key: string;
};

type ModuleOverrideRow = {
  module_key: string;
  enabled: boolean | number;
};

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
    const normalizedValue =
      key === 'businessType'
        ? normalizeBusinessType(value)
        : key === 'businessVertical'
          ? normalizeBusinessVertical(value)
          : value;
    const dbKey = this.dbKey(storeId, key);
    const now = new Date().toISOString();
    await this.prisma.store_settings.upsert({
      where: { key: dbKey },
      update: { value: normalizedValue, updated_at: now },
      create: { key: dbKey, value: normalizedValue, updated_at: now },
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
        const normalizedValue =
          key === 'businessType'
            ? normalizeBusinessType(value)
            : key === 'businessVertical'
              ? normalizeBusinessVertical(value)
              : value;
        const dbKey = this.dbKey(storeId, key);
        return this.prisma.store_settings.upsert({
          where: { key: dbKey },
          update: { value: normalizedValue, updated_at: now },
          create: { key: dbKey, value: normalizedValue, updated_at: now },
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

  async getBusinessProfile(storeId = 'default-store') {
    const profile = await this.getStoreBusinessProfile(storeId);
    if (profile) return this.toBusinessProfileResponse(storeId, profile);

    const settings = await this.getSettings(storeId);
    const vertical = normalizeBusinessVertical(
      settings.businessVertical ?? settings.businessType,
    );
    return {
      storeId,
      requestedBusinessVertical: null,
      verifiedBusinessVertical: vertical,
      verificationStatus: StoreVerificationStatus.VERIFIED,
      verifiedBy: 'compatibility',
      verifiedAt: null,
      notes: 'Compatibility profile from store_settings.',
      createdAt: null,
      updatedAt: null,
    };
  }

  async requestBusinessVertical(params: {
    storeId: string;
    requestedBusinessVertical: string;
    actor: string;
    notes?: string;
  }) {
    const requested = normalizeBusinessVertical(
      params.requestedBusinessVertical,
    );
    const now = new Date().toISOString();
    const existing = await this.getStoreBusinessProfile(params.storeId);
    const verified = existing
      ? normalizeBusinessVertical(existing.verified_business_vertical)
      : BusinessVertical.GENERAL;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO store_business_profiles (
         store_id,
         requested_business_vertical,
         verified_business_vertical,
         verification_status,
         notes,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(store_id)
       DO UPDATE SET
         requested_business_vertical = excluded.requested_business_vertical,
         verification_status = excluded.verification_status,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      params.storeId,
      requested,
      verified,
      StoreVerificationStatus.PENDING,
      params.notes ?? `Requested by ${params.actor}`,
      now,
      now,
    );

    this.logger.log(
      `Business vertical requested: store=${params.storeId} requested=${requested} by=${params.actor}`,
    );
    return this.getBusinessProfile(params.storeId);
  }

  async verifyBusinessProfile(params: {
    storeId: string;
    businessVertical: string;
    verifiedBy: string;
    notes?: string;
  }) {
    const verified = normalizeBusinessVertical(params.businessVertical);
    const now = new Date().toISOString();

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO store_business_profiles (
         store_id,
         requested_business_vertical,
         verified_business_vertical,
         verification_status,
         verified_by,
         verified_at,
         notes,
         created_at,
         updated_at
       )
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(store_id)
       DO UPDATE SET
         requested_business_vertical = NULL,
         verified_business_vertical = excluded.verified_business_vertical,
         verification_status = excluded.verification_status,
         verified_by = excluded.verified_by,
         verified_at = excluded.verified_at,
         notes = excluded.notes,
         updated_at = excluded.updated_at`,
      params.storeId,
      verified,
      StoreVerificationStatus.VERIFIED,
      params.verifiedBy,
      now,
      params.notes ?? null,
      now,
      now,
    );

    this.logger.log(
      `Business vertical verified: store=${params.storeId} vertical=${verified} by=${params.verifiedBy}`,
    );
    return this.getBusinessProfile(params.storeId);
  }

  async setModuleOverride(params: {
    storeId: string;
    moduleKey: string;
    enabled: boolean;
    updatedBy: string;
    reason?: string;
  }) {
    const moduleExists = await this.moduleExists(params.moduleKey);
    if (!moduleExists) {
      throw new BadRequestException(
        `Unknown platform module '${params.moduleKey}'`,
      );
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO store_module_overrides (
         store_id,
         module_key,
         enabled,
         reason,
         updated_by,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(store_id, module_key)
       DO UPDATE SET
         enabled = excluded.enabled,
         reason = excluded.reason,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      params.storeId,
      params.moduleKey,
      params.enabled ? 1 : 0,
      params.reason ?? null,
      params.updatedBy,
      new Date().toISOString(),
    );

    this.logger.log(
      `Module override updated: store=${params.storeId} module=${params.moduleKey} enabled=${params.enabled}`,
    );
    return this.getCapabilities(params.storeId);
  }

  /**
   * Get store info.
   * NOTE: There is no `stores` table in the current schema.
   * This returns a synthetic object from config until a stores table is added (P8-2).
   */
  async getStoreInfo(storeId = 'default-store') {
    const settings = await this.getSettings(storeId);
    const businessType = normalizeBusinessType(settings.businessType);
    const businessVertical = normalizeBusinessVertical(
      settings.businessVertical ?? settings.businessType,
    );
    return {
      storeId,
      name: settings.storeName || 'Lecrion',
      tenantId: 'default',
      status: 'active',
      businessType,
      businessVertical,
      isFnb: businessVertical === BusinessVertical.RESTAURANT_CAFE,
    };
  }

  async getCapabilities(
    storeId = 'default-store',
  ): Promise<StoreCapabilitiesResponse> {
    const settings = await this.getSettings(storeId);
    const profile = await this.getStoreBusinessProfile(storeId);
    const fallbackVertical = normalizeBusinessVertical(
      settings.businessVertical ?? settings.businessType,
    );
    const businessVertical = profile
      ? normalizeBusinessVertical(profile.verified_business_vertical)
      : fallbackVertical;
    const requestedBusinessVertical = profile?.requested_business_vertical
      ? normalizeBusinessVertical(profile.requested_business_vertical)
      : null;
    const verificationStatus = profile
      ? normalizeVerificationStatus(profile.verification_status)
      : StoreVerificationStatus.VERIFIED;

    const [dbCoreModules, dbVerticalModules, overrides] = await Promise.all([
      this.getCoreModulesFromCatalog(),
      this.getVerticalModulesFromCatalog(businessVertical),
      this.getModuleOverrides(storeId),
    ]);

    const coreModules =
      dbCoreModules.length > 0
        ? dbCoreModules
        : ([...CORE_MODULES] as PlatformModuleValue[]);
    const verticalModules =
      dbVerticalModules.length > 0
        ? dbVerticalModules
        : ([...(VERTICAL_MODULES[businessVertical] ?? [])] as PlatformModuleValue[]);
    const enabledModuleSet = new Set<PlatformModuleValue>([
      ...coreModules,
      ...verticalModules,
    ]);

    for (const override of overrides) {
      const moduleKey = override.module_key as PlatformModuleValue;
      if (Boolean(override.enabled)) {
        enabledModuleSet.add(moduleKey);
      } else {
        enabledModuleSet.delete(moduleKey);
      }
    }

    return {
      storeId,
      businessVertical,
      requestedBusinessVertical,
      verificationStatus,
      enabledModules: Array.from(enabledModuleSet),
      coreModules,
      verticalModules,
    };
  }

  /**
   * Get the calculation policy for a store.
   * Returns parsed numeric values with safe defaults.
   * Used by POS frontend to display tax/service charge before checkout.
   */
  async getCalcPolicy(storeId = 'default-store'): Promise<{
    taxRate: number;
    serviceChargeRate: number;
    taxMode: 'exclusive' | 'inclusive';
    discountMaxWithoutApproval: number;
  }> {
    const settings = await this.getSettings(storeId);

    const parseRate = (raw: string | undefined, fallback: number): number => {
      if (!raw) return fallback;
      const n = parseFloat(raw);
      return isNaN(n) || n < 0 || n > 1 ? fallback : n;
    };
    const parseAmount = (raw: string | undefined, fallback: number): number => {
      if (!raw) return fallback;
      const n = parseFloat(raw);
      return isNaN(n) || n < 0 ? fallback : n;
    };

    const rawTaxMode = settings[CALC_POLICY_KEYS.TAX_MODE];
    return {
      taxRate: parseRate(settings[CALC_POLICY_KEYS.TAX_RATE], 0),
      serviceChargeRate: parseRate(
        settings[CALC_POLICY_KEYS.SERVICE_CHARGE_RATE],
        0,
      ),
      taxMode: rawTaxMode === 'inclusive' ? 'inclusive' : 'exclusive',
      discountMaxWithoutApproval: parseAmount(
        settings[CALC_POLICY_KEYS.DISCOUNT_MAX_WITHOUT_APPROVAL],
        0,
      ),
    };
  }

  private async getStoreBusinessProfile(
    storeId: string,
  ): Promise<StoreBusinessProfileRow | null> {
    const rows = await this.queryOptional<StoreBusinessProfileRow>(
      `SELECT store_id,
              requested_business_vertical,
              verified_business_vertical,
              verification_status,
              verified_by,
              verified_at,
              notes,
              created_at,
              updated_at
       FROM store_business_profiles
       WHERE store_id = ?
       LIMIT 1`,
      storeId,
    );
    return rows?.[0] ?? null;
  }

  private async getCoreModulesFromCatalog(): Promise<PlatformModuleValue[]> {
    const rows = await this.queryOptional<ModuleRow>(
      `SELECT key
       FROM platform_modules
       WHERE is_core = true AND is_active = true
       ORDER BY key ASC`,
    );
    return this.toKnownModules(rows);
  }

  private async getVerticalModulesFromCatalog(
    vertical: BusinessVerticalValue,
  ): Promise<PlatformModuleValue[]> {
    const rows = await this.queryOptional<ModuleRow>(
      `SELECT pm.key
       FROM business_vertical_modules bvm
       JOIN platform_modules pm ON pm.key = bvm.module_key
       WHERE bvm.vertical_key = ?
         AND bvm.is_default = true
         AND pm.is_active = true
       ORDER BY pm.key ASC`,
      vertical,
    );
    return this.toKnownModules(rows);
  }

  private async getModuleOverrides(
    storeId: string,
  ): Promise<ModuleOverrideRow[]> {
    return (
      (await this.queryOptional<ModuleOverrideRow>(
        `SELECT module_key, enabled
         FROM store_module_overrides
         WHERE store_id = ?`,
        storeId,
      )) ?? []
    );
  }

  private toKnownModules(rows: ModuleRow[] | null | undefined) {
    if (!rows) return [];
    return rows
      .map((row) => row.key)
      .filter((key): key is PlatformModuleValue => Boolean(key));
  }

  private async moduleExists(moduleKey: string): Promise<boolean> {
    const rows = await this.queryOptional<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM platform_modules
       WHERE key = ? AND is_active = true`,
      moduleKey,
    );
    return Number(rows?.[0]?.count ?? 0) > 0;
  }

  private toBusinessProfileResponse(
    storeId: string,
    profile: StoreBusinessProfileRow,
  ) {
    return {
      storeId: profile.store_id ?? storeId,
      requestedBusinessVertical: profile.requested_business_vertical
        ? normalizeBusinessVertical(profile.requested_business_vertical)
        : null,
      verifiedBusinessVertical: normalizeBusinessVertical(
        profile.verified_business_vertical,
      ),
      verificationStatus: normalizeVerificationStatus(
        profile.verification_status,
      ),
      verifiedBy: profile.verified_by ?? null,
      verifiedAt: profile.verified_at ?? null,
      notes: profile.notes ?? null,
      createdAt: profile.created_at ?? null,
      updatedAt: profile.updated_at ?? null,
    };
  }

  private async queryOptional<T>(
    sql: string,
    ...params: unknown[]
  ): Promise<T[] | null> {
    try {
      return (await this.prisma.$queryRawUnsafe(sql, ...params)) as T[];
    } catch {
      return null;
    }
  }
}
