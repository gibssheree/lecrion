-- ============================================================================
-- Migration: 20260515050000_phase6a_catalog_generalization
-- Purpose  : Phase 6A — Product and Catalog Generalization
--            Add product_categories, product_variants, product_barcodes tables.
--            Add category_id FK to menu table.
-- Strategy : ADDITIVE ONLY — no existing columns are dropped or renamed.
--            All new FK columns are nullable so existing rows need no backfill.
-- Compat   : SQLite (dev). PostgreSQL migration note at bottom of file.
-- ============================================================================

-- ── product_categories ────────────────────────────────────────────────────────
-- Hierarchical product category tree.
-- parent_id = NULL means top-level category.
-- sort_order controls display order within the same parent.
CREATE TABLE IF NOT EXISTS "product_categories" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name"        TEXT    NOT NULL,
  "slug"        TEXT    NOT NULL,
  "description" TEXT,
  "parent_id"   INTEGER,
  "sort_order"  INTEGER NOT NULL DEFAULT 0,
  "is_active"   BOOLEAN NOT NULL DEFAULT 1,
  "store_id"    TEXT    NOT NULL DEFAULT 'default-store',
  "created_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_category_slug_store"
  ON "product_categories"("slug", "store_id");

CREATE INDEX IF NOT EXISTS "idx_category_store_active"
  ON "product_categories"("store_id", "is_active");

CREATE INDEX IF NOT EXISTS "idx_category_parent"
  ON "product_categories"("parent_id");

-- ── product_variants ──────────────────────────────────────────────────────────
-- Variant children of a parent product (e.g. size S/M/L, color Red/Blue).
-- parent_product_id references menu.id (the parent product).
-- variant_product_id references menu.id (the child product row).
-- variant_type: "size" | "color" | "material" | "grade" | "custom"
-- variant_value: the specific value (e.g. "L", "Red", "Grade A")
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id"                 INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "parent_product_id"  INTEGER NOT NULL,
  "variant_product_id" INTEGER NOT NULL,
  "variant_type"       TEXT    NOT NULL DEFAULT 'custom',
  "variant_value"      TEXT    NOT NULL,
  "sort_order"         INTEGER NOT NULL DEFAULT 0,
  "is_active"          BOOLEAN NOT NULL DEFAULT 1,
  "created_at"         TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("parent_product_id")  REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("variant_product_id") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_variant_parent_child"
  ON "product_variants"("parent_product_id", "variant_product_id");

CREATE INDEX IF NOT EXISTS "idx_variant_parent"
  ON "product_variants"("parent_product_id");

CREATE INDEX IF NOT EXISTS "idx_variant_child"
  ON "product_variants"("variant_product_id");

-- ── product_barcodes ──────────────────────────────────────────────────────────
-- Additional barcodes per product (a product can have multiple barcodes:
-- EAN-13, QR, internal, etc.).
-- The primary barcode is still stored in menu.barcode for fast lookup.
-- This table handles secondary/alias barcodes.
-- barcode_type: "ean13" | "ean8" | "qr" | "code128" | "internal" | "custom"
CREATE TABLE IF NOT EXISTS "product_barcodes" (
  "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "menu_id"      INTEGER NOT NULL,
  "barcode"      TEXT    NOT NULL,
  "barcode_type" TEXT    NOT NULL DEFAULT 'ean13',
  "is_primary"   BOOLEAN NOT NULL DEFAULT 0,
  "created_at"   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_product_barcode"
  ON "product_barcodes"("barcode");

CREATE INDEX IF NOT EXISTS "idx_product_barcodes_menu"
  ON "product_barcodes"("menu_id");

-- ── Add category_id FK to menu ────────────────────────────────────────────────
-- Nullable so all existing rows remain valid (no category assigned yet).
ALTER TABLE "menu" ADD COLUMN "category_id" INTEGER REFERENCES "product_categories"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_menu_category_id"
  ON "menu"("category_id");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. All existing menu rows get category_id = NULL.
--    CatalogService.inferCategory() continues to work as fallback.
--    When a category is assigned, the DB value takes precedence.
--
-- 2. product_variants and product_barcodes are empty on migration.
--    Existing products are unaffected.
--
-- 3. POS sale path reads menu.id, menu.stock, menu.price only.
--    None of the new tables are in the sale transaction critical path.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL or BIGSERIAL.
-- Replace BOOLEAN with BOOLEAN (same).
-- Replace TEXT with VARCHAR(255) or TEXT as appropriate.
-- Add IF NOT EXISTS to all CREATE TABLE / CREATE INDEX statements.
-- ALTER TABLE "menu" ADD COLUMN IF NOT EXISTS "category_id" INTEGER REFERENCES ...
-- ============================================================================
