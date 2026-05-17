-- Migration: 20260515010000_pos_receipt_corrections_foundation
-- Phase 4/5 enterprise contract foundation.
--
-- Additive only. Existing orders/payments/order_items/cashflow paths remain
-- intact. These tables provide immutable receipt snapshots, collision-safe
-- receipt sequencing, correction documents, and manager approval placeholders.

CREATE TABLE IF NOT EXISTS "pos_sales" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "receipt_number" TEXT NOT NULL,
  "client_sale_id" TEXT,
  "order_id" INTEGER NOT NULL,
  "register_session_id" INTEGER NOT NULL,
  "cashier_id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL DEFAULT 'default-store',
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "order_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'paid',
  "subtotal" REAL NOT NULL,
  "discount_amount" REAL NOT NULL DEFAULT 0,
  "discount_reason" TEXT,
  "tax_amount" REAL NOT NULL DEFAULT 0,
  "tax_mode" TEXT NOT NULL DEFAULT 'exclusive',
  "service_charge_amount" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL,
  "paid_total" REAL NOT NULL,
  "change_amount" REAL NOT NULL DEFAULT 0,
  "payment_methods" TEXT NOT NULL DEFAULT '[]',
  "payment_lines" TEXT NOT NULL DEFAULT '[]',
  "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

CREATE UNIQUE INDEX IF NOT EXISTS "pos_sales_receipt_number_key" ON "pos_sales"("receipt_number");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_sales_order_id_key" ON "pos_sales"("order_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sales_created" ON "pos_sales"("created_at");
CREATE INDEX IF NOT EXISTS "idx_pos_sales_store_created" ON "pos_sales"("store_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_pos_sales_session_created" ON "pos_sales"("register_session_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_pos_sales_status" ON "pos_sales"("status");

CREATE TABLE IF NOT EXISTS "pos_sale_items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "sale_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unit_price" REAL NOT NULL,
  "line_total" REAL NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
  CONSTRAINT "pos_sale_items_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "pos_sales" ("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_pos_sale_items_sale" ON "pos_sale_items"("sale_id");
CREATE INDEX IF NOT EXISTS "idx_pos_sale_items_product" ON "pos_sale_items"("product_id");

CREATE TABLE IF NOT EXISTS "receipt_sequences" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "register_session_id" INTEGER NOT NULL,
  "business_date" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
  "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_receipt_sequence_scope"
  ON "receipt_sequences"("store_id", "register_session_id", "business_date");
CREATE INDEX IF NOT EXISTS "idx_receipt_sequences_date" ON "receipt_sequences"("business_date");

CREATE TABLE IF NOT EXISTS "manager_approvals" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "approval_type" TEXT NOT NULL,
  "requested_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
  "resolved_at" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_manager_approvals_type_status"
  ON "manager_approvals"("approval_type", "status");
CREATE INDEX IF NOT EXISTS "idx_manager_approvals_created" ON "manager_approvals"("created_at");

CREATE TABLE IF NOT EXISTS "pos_corrections" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "correction_number" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "operator_id" TEXT NOT NULL,
  "manager_approval_id" INTEGER,
  "original_order_id" INTEGER NOT NULL,
  "sale_id" INTEGER,
  "amount" REAL NOT NULL DEFAULT 0,
  "metadata" TEXT,
  "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
  CONSTRAINT "pos_corrections_manager_approval_id_fkey"
    FOREIGN KEY ("manager_approval_id") REFERENCES "manager_approvals" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "pos_corrections_sale_id_fkey"
    FOREIGN KEY ("sale_id") REFERENCES "pos_sales" ("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "pos_corrections_correction_number_key"
  ON "pos_corrections"("correction_number");
CREATE INDEX IF NOT EXISTS "idx_pos_corrections_order" ON "pos_corrections"("original_order_id");
CREATE INDEX IF NOT EXISTS "idx_pos_corrections_sale" ON "pos_corrections"("sale_id");
CREATE INDEX IF NOT EXISTS "idx_pos_corrections_type_created"
  ON "pos_corrections"("type", "created_at");
