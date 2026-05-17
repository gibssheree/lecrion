-- ============================================================================
-- Migration: 20260515040000_operation_documents
-- Purpose  : Add enterprise operational document foundation for stock and
--            purchasing workflows: purchase orders, goods receipts, stock
--            transfers, and stock adjustments.
-- Strategy : ADDITIVE ONLY — no existing tables, columns, or indexes are
--            dropped or renamed. All new tables have safe defaults.
-- Compat   : SQLite (dev). PostgreSQL notes at bottom.
-- ============================================================================

-- ── operation_document_sequences ─────────────────────────────────────────────
-- Collision-safe per-store/type/date sequence for document numbers.
-- Format: {TYPE_PREFIX}-{YYYYMMDD}-{STORE_SHORT}-{SEQ:04d}
-- e.g. GR-20260515-DEF-0001, PO-20260515-DEF-0002

CREATE TABLE IF NOT EXISTS "operation_document_sequences" (
  "id"            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"      TEXT    NOT NULL,
  "document_type" TEXT    NOT NULL,
  "business_date" TEXT    NOT NULL,
  "sequence"      INTEGER NOT NULL DEFAULT 0,
  "created_at"    TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_op_doc_seq_scope"
  ON "operation_document_sequences"("store_id", "document_type", "business_date");

CREATE INDEX IF NOT EXISTS "idx_op_doc_seq_date"
  ON "operation_document_sequences"("business_date");

-- ── operation_documents ───────────────────────────────────────────────────────
-- document_type: "purchase_order" | "goods_receipt" | "stock_transfer" | "stock_adjustment"
-- status:        "draft" | "submitted" | "posted" | "cancelled"
--
-- Posting rules (enforced by service layer, not DB constraints):
--   purchase_order  → no stock movement (intent only)
--   goods_receipt   → RESTOCK movement per line at destination_location_id
--   stock_transfer  → TRANSFER_OUT at source + TRANSFER_IN at destination
--   stock_adjustment → ADJUSTMENT movement per line at destination_location_id
--
-- source_location_id      – required for stock_transfer (origin location)
-- destination_location_id – required for goods_receipt, stock_transfer, stock_adjustment
-- supplier_id / supplier_name – informational for PO and GR
-- linked_document_id      – links goods_receipt back to its purchase_order

CREATE TABLE IF NOT EXISTS "operation_documents" (
  "id"                      INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "document_number"         TEXT    NOT NULL UNIQUE,
  "document_type"           TEXT    NOT NULL,
  "status"                  TEXT    NOT NULL DEFAULT 'draft',
  "store_id"                TEXT    NOT NULL DEFAULT 'default-store',
  "source_location_id"      INTEGER REFERENCES "inventory_locations"("id") ON DELETE SET NULL,
  "destination_location_id" INTEGER REFERENCES "inventory_locations"("id") ON DELETE SET NULL,
  "supplier_id"             TEXT,
  "supplier_name"           TEXT,
  "linked_document_id"      INTEGER REFERENCES "operation_documents"("id") ON DELETE SET NULL,
  "created_by"              TEXT    NOT NULL,
  "submitted_by"            TEXT,
  "posted_by"               TEXT,
  "cancelled_by"            TEXT,
  "notes"                   TEXT,
  "created_at"              TEXT    NOT NULL DEFAULT (datetime('now')),
  "submitted_at"            TEXT,
  "posted_at"               TEXT,
  "cancelled_at"            TEXT
);

CREATE INDEX IF NOT EXISTS "idx_op_doc_store_type_status"
  ON "operation_documents"("store_id", "document_type", "status");

CREATE INDEX IF NOT EXISTS "idx_op_doc_type_status"
  ON "operation_documents"("document_type", "status");

CREATE INDEX IF NOT EXISTS "idx_op_doc_created"
  ON "operation_documents"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_op_doc_linked"
  ON "operation_documents"("linked_document_id");

-- ── operation_document_lines ──────────────────────────────────────────────────
-- One row per product per document.
-- unit_cost is optional — used for goods_receipt to record purchase price.
-- metadata is a JSON string for future extensibility (lot number, expiry, etc.).

CREATE TABLE IF NOT EXISTS "operation_document_lines" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "document_id" INTEGER NOT NULL REFERENCES "operation_documents"("id") ON DELETE CASCADE,
  "menu_id"     INTEGER NOT NULL REFERENCES "menu"("id") ON DELETE RESTRICT,
  "qty"         INTEGER NOT NULL,
  "unit_cost"   REAL,
  "metadata"    TEXT,
  "created_at"  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_op_doc_line_document"
  ON "operation_document_lines"("document_id");

CREATE INDEX IF NOT EXISTS "idx_op_doc_line_menu"
  ON "operation_document_lines"("menu_id");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. No existing tables are modified.
-- 2. inventory_locations is referenced by source_location_id and
--    destination_location_id. If Agent J's location ledger migration
--    (20260515030000) has not run, these FK references will fail.
--    Run migrations in order: 030000 before 040000.
-- 3. stock_change_logs.source_ref will be set to the document_number when
--    a document is posted, enabling traceability from movement → document.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL or BIGSERIAL.
-- Replace TEXT timestamps with TIMESTAMPTZ(3).
-- Add IF NOT EXISTS to all CREATE TABLE / CREATE INDEX statements.
-- FK references use ON DELETE SET NULL / CASCADE / RESTRICT as shown.
-- ============================================================================
