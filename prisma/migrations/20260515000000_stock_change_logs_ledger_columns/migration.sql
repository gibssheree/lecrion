-- Migration: 20260515000000_stock_change_logs_ledger_columns
-- Phase 3 – Inventory Ledger Foundation (Agent D)
--
-- Additive only. No columns are dropped or renamed.
-- Existing rows receive safe defaults so POS sale path continues to work.
--
-- New columns on stock_change_logs:
--   store_id    TEXT NOT NULL DEFAULT 'default-store'
--   operator_id TEXT          (nullable – legacy rows have no operator)
--   source_ref  TEXT          (nullable – free-form reference string)
--
-- New indexes for movement query endpoints.

ALTER TABLE "stock_change_logs" ADD COLUMN "store_id"    TEXT NOT NULL DEFAULT 'default-store';
ALTER TABLE "stock_change_logs" ADD COLUMN "operator_id" TEXT;
ALTER TABLE "stock_change_logs" ADD COLUMN "source_ref"  TEXT;

CREATE INDEX IF NOT EXISTS "idx_scl_store_created" ON "stock_change_logs"("store_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_scl_change_type"   ON "stock_change_logs"("change_type");
