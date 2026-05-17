-- ============================================================================
-- Migration: 20260515070000_phase7_customers_loyalty_promo
-- Purpose  : Phase 7 — Customer, Loyalty, Promo, CRM
--            Add customers, customer_points, loyalty_programs,
--            promotions, promotion_rules, vouchers tables.
-- Strategy : ADDITIVE ONLY. No existing tables modified.
--            FK columns on orders/pos_sales are nullable for backward compat.
-- Compat   : SQLite (dev). PostgreSQL notes at bottom.
-- ============================================================================

-- ── customers ─────────────────────────────────────────────────────────────────
-- A customer profile linked to sales and loyalty.
-- phone is the primary lookup key (WhatsApp / POS search).
-- tier: "regular" | "silver" | "gold" | "platinum"
CREATE TABLE IF NOT EXISTS "customers" (
  "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"     TEXT    NOT NULL DEFAULT 'default-store',
  "name"         TEXT    NOT NULL,
  "phone"        TEXT,
  "email"        TEXT,
  "address"      TEXT,
  "tier"         TEXT    NOT NULL DEFAULT 'regular',
  "notes"        TEXT,
  "is_active"    BOOLEAN NOT NULL DEFAULT 1,
  "created_at"   TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_customer_phone_store"
  ON "customers"("phone", "store_id")
  WHERE "phone" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_customers_store_active"
  ON "customers"("store_id", "is_active");

CREATE INDEX IF NOT EXISTS "idx_customers_name"
  ON "customers"("name");

-- ── loyalty_programs ──────────────────────────────────────────────────────────
-- Defines how points are earned and redeemed.
-- earn_rate: points earned per IDR spent (e.g. 0.01 = 1 point per Rp100)
-- redeem_rate: IDR value per point (e.g. 1.0 = Rp1 per point)
-- min_redeem_points: minimum points required to redeem
-- is_active: only one active program per store at a time (enforced in service)
CREATE TABLE IF NOT EXISTS "loyalty_programs" (
  "id"                 INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"           TEXT    NOT NULL DEFAULT 'default-store',
  "name"               TEXT    NOT NULL,
  "description"        TEXT,
  "earn_rate"          REAL    NOT NULL DEFAULT 0.01,
  "redeem_rate"        REAL    NOT NULL DEFAULT 1.0,
  "min_redeem_points"  INTEGER NOT NULL DEFAULT 100,
  "points_expiry_days" INTEGER,
  "is_active"          BOOLEAN NOT NULL DEFAULT 1,
  "created_at"         TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_loyalty_programs_store_active"
  ON "loyalty_programs"("store_id", "is_active");

-- ── customer_points ───────────────────────────────────────────────────────────
-- Append-only ledger of point transactions per customer.
-- entry_type: "earn" | "redeem" | "expire" | "adjust"
-- reference_type: "pos_sale" | "manual" | "refund"
-- reference_id: the sale ID or adjustment ID
CREATE TABLE IF NOT EXISTS "customer_points" (
  "id"             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "customer_id"    INTEGER NOT NULL,
  "store_id"       TEXT    NOT NULL DEFAULT 'default-store',
  "entry_type"     TEXT    NOT NULL,
  "points"         INTEGER NOT NULL,
  "balance_after"  INTEGER NOT NULL DEFAULT 0,
  "reference_type" TEXT,
  "reference_id"   TEXT,
  "note"           TEXT,
  "expires_at"     TEXT,
  "created_at"     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_customer_points_customer"
  ON "customer_points"("customer_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_customer_points_store"
  ON "customer_points"("store_id", "created_at");

-- ── promotions ────────────────────────────────────────────────────────────────
-- A promotion is a named discount campaign with a validity window.
-- promo_type: "order_discount" | "item_discount" | "bundle" | "buy_x_get_y" | "happy_hour"
-- discount_type: "percent" | "amount"
-- status: "draft" | "active" | "paused" | "expired"
CREATE TABLE IF NOT EXISTS "promotions" (
  "id"             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"       TEXT    NOT NULL DEFAULT 'default-store',
  "name"           TEXT    NOT NULL,
  "description"    TEXT,
  "promo_type"     TEXT    NOT NULL DEFAULT 'order_discount',
  "discount_type"  TEXT    NOT NULL DEFAULT 'percent',
  "discount_value" REAL    NOT NULL DEFAULT 0,
  "min_order_amount" REAL  NOT NULL DEFAULT 0,
  "max_discount_amount" REAL,
  "status"         TEXT    NOT NULL DEFAULT 'draft',
  "starts_at"      TEXT,
  "ends_at"        TEXT,
  "usage_limit"    INTEGER,
  "usage_count"    INTEGER NOT NULL DEFAULT 0,
  "created_at"     TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_promotions_store_status"
  ON "promotions"("store_id", "status");

CREATE INDEX IF NOT EXISTS "idx_promotions_dates"
  ON "promotions"("starts_at", "ends_at");

-- ── promotion_rules ───────────────────────────────────────────────────────────
-- Optional per-item or per-category rules for a promotion.
-- rule_type: "include_product" | "exclude_product" | "include_category" | "min_qty"
-- rule_value: product ID, category ID, or quantity as string
CREATE TABLE IF NOT EXISTS "promotion_rules" (
  "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "promotion_id" INTEGER NOT NULL,
  "rule_type"    TEXT    NOT NULL,
  "rule_value"   TEXT    NOT NULL,
  "created_at"   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_promo_rules_promotion"
  ON "promotion_rules"("promotion_id");

-- ── vouchers ──────────────────────────────────────────────────────────────────
-- A voucher is a single-use or limited-use code that applies a promotion.
-- status: "active" | "used" | "expired" | "cancelled"
-- If promotion_id is NULL, the voucher has its own discount_type/discount_value.
CREATE TABLE IF NOT EXISTS "vouchers" (
  "id"             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"       TEXT    NOT NULL DEFAULT 'default-store',
  "code"           TEXT    NOT NULL,
  "promotion_id"   INTEGER,
  "discount_type"  TEXT    NOT NULL DEFAULT 'percent',
  "discount_value" REAL    NOT NULL DEFAULT 0,
  "min_order_amount" REAL  NOT NULL DEFAULT 0,
  "max_discount_amount" REAL,
  "status"         TEXT    NOT NULL DEFAULT 'active',
  "usage_limit"    INTEGER NOT NULL DEFAULT 1,
  "usage_count"    INTEGER NOT NULL DEFAULT 0,
  "customer_id"    INTEGER,
  "expires_at"     TEXT,
  "created_at"     TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  FOREIGN KEY ("customer_id")  REFERENCES "customers"("id")  ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_voucher_code_store"
  ON "vouchers"("code", "store_id");

CREATE INDEX IF NOT EXISTS "idx_vouchers_store_status"
  ON "vouchers"("store_id", "status");

CREATE INDEX IF NOT EXISTS "idx_vouchers_customer"
  ON "vouchers"("customer_id");

-- ── Add customer_id FK to orders ──────────────────────────────────────────────
-- Nullable — existing orders have no customer linked.
ALTER TABLE "orders" ADD COLUMN "customer_id" INTEGER REFERENCES "customers"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_orders_customer"
  ON "orders"("customer_id");

-- ── Add customer_id and promotion_id FK to pos_sales ─────────────────────────
ALTER TABLE "pos_sales" ADD COLUMN "customer_id"   INTEGER REFERENCES "customers"("id")  ON DELETE SET NULL;
ALTER TABLE "pos_sales" ADD COLUMN "promotion_id"  INTEGER REFERENCES "promotions"("id") ON DELETE SET NULL;
ALTER TABLE "pos_sales" ADD COLUMN "voucher_code"  TEXT;
ALTER TABLE "pos_sales" ADD COLUMN "loyalty_points_earned"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "pos_sales" ADD COLUMN "loyalty_points_redeemed" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_pos_sales_customer"
  ON "pos_sales"("customer_id");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. All existing orders/pos_sales get customer_id = NULL, promotion_id = NULL.
-- 2. POS sale path is unaffected — customer/promo fields are optional.
-- 3. Loyalty points are earned AFTER a sale commits — not inside the sale tx.
--    This avoids blocking the sale on loyalty calculation errors.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL or BIGSERIAL.
-- Add IF NOT EXISTS to all CREATE TABLE / CREATE INDEX.
-- Use PARTIAL INDEX syntax for unique phone: CREATE UNIQUE INDEX ... WHERE phone IS NOT NULL.
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
-- ============================================================================
