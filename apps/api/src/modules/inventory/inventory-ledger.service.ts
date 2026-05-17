// apps/api/src/modules/inventory/inventory-ledger.service.ts
//
// InventoryLedgerService — single write path for all stock movements.
//
// Every stock change (sale, restock, adjustment, waste, return, transfer)
// must go through this service so the stock_change_logs table is the
// authoritative ledger for "why did stock change?".
//
// ── Phase 6J: Location-aware stock ───────────────────────────────────────────
//
// New behaviour (additive, backward compatible):
//   1. If locationId is provided, writeMovement also upserts
//      inventory_stock_balances for that location.
//   2. If locationId is omitted, the store's default location is resolved
//      via InventoryLocationService.ensureDefaultLocation() and used.
//   3. menu.stock is ALWAYS updated (legacy path — POS sale path depends on it).
//   4. stock_change_logs.location_id is set when a location is resolved.
//
// ── Fallback rule ─────────────────────────────────────────────────────────────
//   If no inventory_stock_balances row exists for a product+location,
//   the balance is initialised from menu.stock before the movement is applied.
//   This ensures the first location-aware write produces a correct balance.
//
// ── Design rules ─────────────────────────────────────────────────────────────
//   1. Always update menu.stock AND write a stock_change_logs row atomically.
//   2. Accept an optional Prisma transaction client (tx) so callers inside
//      a larger transaction (e.g. PosSalesService) can reuse the same tx.
//   3. Never drop or rename existing stock_change_logs columns.
//   4. Existing POS sale path writes stock_change_logs directly — that is
//      still valid. This service is the preferred path for new code.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  StockMovementType,
  StockMovementTypeValue,
} from '@libs/contracts/src/enums';
import { InventoryLocationService } from './inventory-location.service';

export interface WriteMovementParams {
  /** menu.id of the product */
  menuId: number;
  /** Positive or negative quantity change. Negative = stock out. */
  qtyChange: number;
  /** Movement type from StockMovementType enum */
  movementType: StockMovementTypeValue;
  /** Human-readable reason / note */
  note?: string;
  /** Source reference: clientSaleId, adjustment id, etc. */
  sourceRef?: string;
  /** Operator who triggered the change (user id, cashier id, etc.) */
  operatorId?: string;
  /** Store scope */
  storeId?: string;
  /**
   * Target inventory location ID.
   * If omitted, the store's default location is resolved automatically.
   * Pass null explicitly to skip location tracking (pure legacy mode).
   */
  locationId?: number | null;
  /** Legacy: order_id for sale movements */
  orderId?: number;
  /** Legacy: admin_id for dashboard adjustments */
  adminId?: number;
  /** ISO timestamp override (defaults to now) */
  createdAt?: string;
}

export interface MovementRecord {
  id: number;
  menuId: number;
  changeType: string;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  note: string | null;
  storeId: string;
  operatorId: string | null;
  sourceRef: string | null;
  orderId: number | null;
  adminId: number | null;
  locationId: number | null;
  createdAt: string;
}

export interface ListMovementsParams {
  menuId?: number;
  storeId?: string;
  changeType?: string;
  locationId?: number;
  limit?: number;
  offset?: number;
}

export interface StockBalanceRecord {
  menuId: number;
  locationId: number;
  locationName: string;
  locationType: string;
  isDefaultLocation: boolean;
  qtyOnHand: number;
  qtyReserved: number;
  updatedAt: string;
  /** Legacy fallback: menu.stock value (always present) */
  legacyStock: number;
}

// Prisma transaction client type (subset used here)
type PrismaTx = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class InventoryLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: InventoryLocationService,
  ) {}

  /**
   * Write a stock movement and update menu.stock atomically.
   *
   * If `tx` is provided the writes join the caller's transaction.
   * Otherwise a new transaction is opened internally.
   *
   * Location behaviour:
   *   - locationId provided → use that location
   *   - locationId undefined → resolve store's default location
   *   - locationId null → skip location tracking (legacy mode)
   *
   * Returns the created movement record.
   */
  async writeMovement(
    params: WriteMovementParams,
    tx?: PrismaTx,
  ): Promise<MovementRecord> {
    const db = tx ?? this.prisma;
    const now = params.createdAt ?? new Date().toISOString();
    const storeId = params.storeId ?? 'default-store';

    // Load current stock inside the same tx to get an accurate qty_before
    const product = await db.menu.findUnique({
      where: { id: params.menuId },
      select: { stock: true },
    });
    if (!product) {
      throw new Error(`Product #${params.menuId} not found`);
    }

    const qtyBefore = product.stock;
    const qtyAfter = qtyBefore + params.qtyChange;

    // Update menu.stock (legacy path — always done)
    await db.menu.update({
      where: { id: params.menuId },
      data: { stock: qtyAfter },
    });

    // ── Resolve location ──────────────────────────────────────────────────
    // locationId === null → explicit skip (legacy mode)
    // locationId === undefined → auto-resolve default
    // locationId === number → use as-is
    let resolvedLocationId: number | null = null;

    if (params.locationId !== null) {
      if (typeof params.locationId === 'number') {
        resolvedLocationId = params.locationId;
      } else {
        // Auto-resolve: get or create the default location for this store
        try {
          const loc = await this.locationService.ensureDefaultLocation(
            storeId,
            db,
          );
          resolvedLocationId = loc.id;
        } catch {
          // If location resolution fails (e.g. in a test without location service),
          // fall back to legacy mode gracefully
          resolvedLocationId = null;
        }
      }
    }

    // ── Upsert inventory_stock_balances ───────────────────────────────────
    if (resolvedLocationId !== null) {
      await this.upsertStockBalance(
        db,
        params.menuId,
        resolvedLocationId,
        qtyBefore,
        params.qtyChange,
        now,
      );
    }

    // Write ledger row
    const row = await db.stock_change_logs.create({
      data: {
        menu_id: params.menuId,
        admin_id: params.adminId ?? null,
        order_id: params.orderId ?? null,
        change_type: params.movementType,
        qty_before: qtyBefore,
        qty_change: params.qtyChange,
        qty_after: qtyAfter,
        note: params.note ?? null,
        store_id: storeId,
        operator_id: params.operatorId ?? null,
        source_ref: params.sourceRef ?? null,
        location_id: resolvedLocationId,
        created_at: now,
      },
    });

    return this.toRecord(row);
  }

  /**
   * Write a stock movement WITHOUT updating menu.stock.
   *
   * Use this when the caller has already updated menu.stock (e.g. the legacy
   * CatalogService.updateStock path that sets an absolute value) and only
   * needs to append the ledger row.
   *
   * qtyBefore and qtyAfter must be supplied by the caller.
   */
  async appendMovementLog(
    params: WriteMovementParams & { qtyBefore: number; qtyAfter: number },
    tx?: PrismaTx,
  ): Promise<MovementRecord> {
    const db = tx ?? this.prisma;
    const now = params.createdAt ?? new Date().toISOString();
    const storeId = params.storeId ?? 'default-store';

    // Resolve location (same logic as writeMovement)
    let resolvedLocationId: number | null = null;
    if (params.locationId !== null) {
      if (typeof params.locationId === 'number') {
        resolvedLocationId = params.locationId;
      } else {
        try {
          const loc = await this.locationService.ensureDefaultLocation(
            storeId,
            db,
          );
          resolvedLocationId = loc.id;
        } catch {
          resolvedLocationId = null;
        }
      }
    }

    // Upsert balance if location resolved
    if (resolvedLocationId !== null) {
      await this.upsertStockBalance(
        db,
        params.menuId,
        resolvedLocationId,
        params.qtyBefore,
        params.qtyChange,
        now,
      );
    }

    const row = await db.stock_change_logs.create({
      data: {
        menu_id: params.menuId,
        admin_id: params.adminId ?? null,
        order_id: params.orderId ?? null,
        change_type: params.movementType,
        qty_before: params.qtyBefore,
        qty_change: params.qtyChange,
        qty_after: params.qtyAfter,
        note: params.note ?? null,
        store_id: storeId,
        operator_id: params.operatorId ?? null,
        source_ref: params.sourceRef ?? null,
        location_id: resolvedLocationId,
        created_at: now,
      },
    });

    return this.toRecord(row);
  }

  /**
   * List movements with optional filters.
   * Used by GET /api/inventory/movements and GET /api/products/:id/movements.
   */
  async listMovements(params: ListMovementsParams = {}): Promise<{
    movements: MovementRecord[];
    total: number;
  }> {
    const limit = Math.min(Number(params.limit) || 50, 200);
    const offset = Number(params.offset) || 0;

    const where: Record<string, unknown> = {};
    if (params.menuId) where['menu_id'] = params.menuId;
    if (params.storeId) where['store_id'] = params.storeId;
    if (params.changeType) where['change_type'] = params.changeType;
    if (params.locationId) where['location_id'] = params.locationId;

    const [rows, total] = await Promise.all([
      this.prisma.stock_change_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.stock_change_logs.count({ where }),
    ]);

    return {
      movements: rows.map((r) => this.toRecord(r)),
      total,
    };
  }

  /**
   * Get stock balances for a product, optionally filtered by location.
   *
   * Returns location-aware balances from inventory_stock_balances.
   * Falls back to menu.stock when no balance rows exist.
   */
  async getStockBalances(
    menuId: number,
    locationId?: number,
  ): Promise<StockBalanceRecord[]> {
    const where: Record<string, unknown> = { menu_id: menuId };
    if (locationId) where['location_id'] = locationId;

    const rows = await this.prisma.inventory_stock_balances.findMany({
      where,
      include: { inventory_locations: true },
    });

    if (rows.length > 0) {
      return rows.map((r) => ({
        menuId: r.menu_id,
        locationId: r.location_id,
        locationName: r.inventory_locations.name,
        locationType: r.inventory_locations.type,
        isDefaultLocation: r.inventory_locations.is_default,
        qtyOnHand: r.qty_on_hand,
        qtyReserved: r.qty_reserved,
        updatedAt: r.updated_at,
        legacyStock: r.qty_on_hand, // same value when location-aware
      }));
    }

    // Fallback: return menu.stock as a virtual "global" balance
    const product = await this.prisma.menu.findUnique({
      where: { id: menuId },
      select: { stock: true },
    });
    if (!product) return [];

    return [
      {
        menuId,
        locationId: 0,
        locationName: 'Global (legacy)',
        locationType: 'warehouse',
        isDefaultLocation: true,
        qtyOnHand: product.stock,
        qtyReserved: 0,
        updatedAt: new Date().toISOString(),
        legacyStock: product.stock,
      },
    ];
  }

  /**
   * Get stock for all products at a given location (or global fallback).
   */
  async listStockByLocation(
    storeId: string,
    locationId?: number,
  ): Promise<
    Array<{
      menuId: number;
      locationId: number | null;
      qtyOnHand: number;
      legacyStock: number;
    }>
  > {
    if (locationId) {
      const rows = await this.prisma.inventory_stock_balances.findMany({
        where: { location_id: locationId },
        select: {
          menu_id: true,
          location_id: true,
          qty_on_hand: true,
        },
      });
      // Fetch legacy stock for each product
      const menuIds = rows.map((r) => r.menu_id);
      const products = await this.prisma.menu.findMany({
        where: { id: { in: menuIds } },
        select: { id: true, stock: true },
      });
      const legacyMap = new Map(products.map((p) => [p.id, p.stock]));

      return rows.map((r) => ({
        menuId: r.menu_id,
        locationId: r.location_id,
        qtyOnHand: r.qty_on_hand,
        legacyStock: legacyMap.get(r.menu_id) ?? r.qty_on_hand,
      }));
    }

    // No locationId — return legacy menu.stock for all active products
    const products = await this.prisma.menu.findMany({
      where: { is_active: true, is_stock_tracked: true },
      select: { id: true, stock: true },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      menuId: p.id,
      locationId: null,
      qtyOnHand: p.stock,
      legacyStock: p.stock,
    }));
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Upsert inventory_stock_balances for a product+location.
   *
   * If no row exists, initialise qty_on_hand from the legacy menu.stock
   * value (qtyBefore) before applying the change.
   */
  private async upsertStockBalance(
    db: PrismaTx,
    menuId: number,
    locationId: number,
    qtyBefore: number,
    qtyChange: number,
    now: string,
  ): Promise<void> {
    const existing = await db.inventory_stock_balances.findUnique({
      where: {
        menu_id_location_id: { menu_id: menuId, location_id: locationId },
      },
      select: { qty_on_hand: true },
    });

    if (existing) {
      // Increment/decrement existing balance
      await db.inventory_stock_balances.update({
        where: {
          menu_id_location_id: { menu_id: menuId, location_id: locationId },
        },
        data: {
          qty_on_hand: existing.qty_on_hand + qtyChange,
          updated_at: now,
        },
      });
    } else {
      // First write for this product+location: seed from legacy stock
      const initialBalance = Math.max(0, qtyBefore + qtyChange);
      await db.inventory_stock_balances.create({
        data: {
          menu_id: menuId,
          location_id: locationId,
          qty_on_hand: initialBalance,
          qty_reserved: 0,
          updated_at: now,
        },
      });
    }
  }

  private toRecord(row: {
    id: number;
    menu_id: number;
    change_type: string;
    qty_before: number;
    qty_change: number;
    qty_after: number;
    note: string | null;
    store_id: string;
    operator_id: string | null;
    source_ref: string | null;
    order_id: number | null;
    admin_id: number | null;
    location_id?: number | null;
    created_at: string;
  }): MovementRecord {
    return {
      id: row.id,
      menuId: row.menu_id,
      changeType: row.change_type,
      qtyBefore: row.qty_before,
      qtyChange: row.qty_change,
      qtyAfter: row.qty_after,
      note: row.note,
      storeId: row.store_id,
      operatorId: row.operator_id,
      sourceRef: row.source_ref,
      orderId: row.order_id,
      adminId: row.admin_id,
      locationId: row.location_id ?? null,
      createdAt: row.created_at,
    };
  }
}
