-- ============================================================================
-- Migration: 20260515020000_catalog_product_generalization
-- Purpose  : Add multi-business product generalization fields to the menu table.
-- Strategy : ADDITIVE ONLY — no existing columns are dropped or renamed.
--            All new columns have DEFAULT values so existing rows require
--            zero backfill and the POS sale path remains fully operational.
-- Compat   : SQLite (dev). PostgreSQL migration note at bottom of file.
-- ============================================================================

-- ── New nullable / defaulted columns on menu ─────────────────────────────────

ALTER TABLE "menu" ADD COLUMN "sku"               TEXT;
ALTER TABLE "menu" ADD COLUMN "barcode"           TEXT;
ALTER TABLE "menu" ADD COLUMN "product_type"      TEXT    NOT NULL DEFAULT 'simple';
ALTER TABLE "menu" ADD COLUMN "unit_name"         TEXT;
ALTER TABLE "menu" ADD COLUMN "unit_code"         TEXT;
ALTER TABLE "menu" ADD COLUMN "brand"             TEXT;
ALTER TABLE "menu" ADD COLUMN "supplier_name"     TEXT;
ALTER TABLE "menu" ADD COLUMN "supplier_id"       TEXT;
ALTER TABLE "menu" ADD COLUMN "attributes"        TEXT;
ALTER TABLE "menu" ADD COLUMN "parent_product_id" INTEGER;
ALTER TABLE "menu" ADD COLUMN "is_stock_tracked"  BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE "menu" ADD COLUMN "is_active"         BOOLEAN NOT NULL DEFAULT 1;

-- ── Indexes for common query patterns ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_menu_sku"             ON "menu"("sku");
CREATE INDEX IF NOT EXISTS "idx_menu_barcode"         ON "menu"("barcode");
CREATE INDEX IF NOT EXISTS "idx_menu_product_type"    ON "menu"("product_type");
CREATE INDEX IF NOT EXISTS "idx_menu_active_tracked"  ON "menu"("is_active", "is_stock_tracked");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. All existing rows automatically get:
--      product_type     = 'simple'
--      is_stock_tracked = 1 (true)  → stock decrement on sale continues
--      is_active        = 1 (true)  → all existing products remain sellable
--      sku / barcode / brand / …    = NULL (no data loss)
--
-- 2. POS sale path (PosSalesService) reads menu.stock and menu.id only.
--    None of the new columns are in the sale transaction critical path.
--
-- 3. cart_items, order_items, pos_sale_items, stock_change_logs reference
--    menu.id which is unchanged.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- When switching to PostgreSQL replace the ALTER TABLE statements with:
--   ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "sku" VARCHAR(255);
--   ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "product_type" VARCHAR(50) NOT NULL DEFAULT 'simple';
--   ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "is_stock_tracked" BOOLEAN NOT NULL DEFAULT TRUE;
--   ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;
--   ... (remaining nullable columns with IF NOT EXISTS)
-- ============================================================================
