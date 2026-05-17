-- ============================================================================
-- Migration: 20260515030000_inventory_location_ledger
-- Purpose  : Add inventory location and stock balance tables.
--            Add location_id to stock_change_logs for movement traceability.
-- Strategy : ADDITIVE ONLY — no existing columns are dropped or renamed.
--            All new tables have safe defaults.
--            menu.stock remains the authoritative stock number for the POS
--            sale path until inventory_stock_balances is fully populated.
-- Compat   : SQLite (dev). PostgreSQL notes at bottom.
-- ============================================================================

-- ── inventory_locations ───────────────────────────────────────────────────────
-- Represents a physical or logical stock location within a store.
-- type values: "warehouse" | "floor" | "pos" | "transit" | "damaged" | "virtual"
-- Every store gets a default "warehouse" location created by the service layer
-- on first use — no seed data required here.

CREATE TABLE IF NOT EXISTS "inventory_locations" (
  "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"   TEXT    NOT NULL DEFAULT 'default-store',
  "name"       TEXT    NOT NULL,
  "type"       TEXT    NOT NULL DEFAULT 'warehouse',
  "is_default" BOOLEAN NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN NOT NULL DEFAULT 1,
  "created_at" TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_inv_loc_store"
  ON "inventory_locations"("store_id");

CREATE INDEX IF NOT EXISTS "idx_inv_loc_store_default"
  ON "inventory_locations"("store_id", "is_default");

CREATE INDEX IF NOT EXISTS "idx_inv_loc_active"
  ON "inventory_locations"("store_id", "is_active");

-- ── inventory_stock_balances ──────────────────────────────────────────────────
-- Per-location stock balance for each product.
-- qty_on_hand  – physical units available at this location
-- qty_reserved – units reserved for pending orders (optional, defaults 0)
-- updated_at   – last write timestamp (ISO string)
--
-- Uniqueness: one row per (menu_id, location_id) pair.
-- Fallback: if no row exists for a product+location, callers fall back to
--           menu.stock (legacy global stock).

CREATE TABLE IF NOT EXISTS "inventory_stock_balances" (
  "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "menu_id"      INTEGER NOT NULL,
  "location_id"  INTEGER NOT NULL,
  "qty_on_hand"  INTEGER NOT NULL DEFAULT 0,
  "qty_reserved" INTEGER NOT NULL DEFAULT 0,
  "updated_at"   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("menu_id")     REFERENCES "menu"("id")                   ON DELETE CASCADE,
  FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id")    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_stock_balance_product_location"
  ON "inventory_stock_balances"("menu_id", "location_id");

CREATE INDEX IF NOT EXISTS "idx_stock_balance_location"
  ON "inventory_stock_balances"("location_id");

CREATE INDEX IF NOT EXISTS "idx_stock_balance_menu"
  ON "inventory_stock_balances"("menu_id");

-- ── stock_change_logs: add location_id ───────────────────────────────────────
-- Nullable — existing rows have no location context (legacy global stock).
-- New movements written through InventoryLedgerService will populate this.

ALTER TABLE "stock_change_logs" ADD COLUMN "location_id" INTEGER REFERENCES "inventory_locations"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_scl_location"
  ON "stock_change_logs"("location_id");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. menu.stock is NOT removed. POS sale path continues to read/write it.
--    inventory_stock_balances is populated in parallel as locations are used.
--
-- 2. InventoryLedgerService.writeMovement() now:
--    a. Updates menu.stock (legacy path — unchanged).
--    b. Upserts inventory_stock_balances for the target location.
--    c. Sets location_id on the stock_change_logs row.
--    If no location is specified, the store's default location is used.
--    If no default location exists, only menu.stock is updated (pure legacy).
--
-- 3. GET /api/inventory/stock?locationId= returns location-aware balances.
--    Without locationId it returns menu.stock (legacy behavior).
--
-- 4. Removing menu.stock dependency requires:
--    a. All products have inventory_stock_balances rows for their default location.
--    b. PosSalesService reads from inventory_stock_balances instead of menu.stock.
--    c. A migration to mark menu.stock as deprecated.
--    This is tracked as a future phase — not done here.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL or BIGSERIAL.
-- Replace BOOLEAN with BOOLEAN (native).
-- Replace TEXT timestamps with TIMESTAMPTZ(3).
-- Add IF NOT EXISTS to all CREATE TABLE / CREATE INDEX statements.
-- ALTER TABLE stock_change_logs ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES ...
-- ============================================================================
