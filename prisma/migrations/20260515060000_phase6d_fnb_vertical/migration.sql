-- ============================================================================
-- Migration: 20260515060000_phase6d_fnb_vertical
-- Purpose  : Phase 6D — F&B Vertical Module
--            Add dining_areas, dining_tables, kitchen_tickets,
--            kitchen_ticket_items tables.
-- Strategy : ADDITIVE ONLY. No existing tables modified.
--            All FK columns on orders are nullable for backward compat.
-- Compat   : SQLite (dev). PostgreSQL notes at bottom.
-- ============================================================================

-- ── dining_areas ─────────────────────────────────────────────────────────────
-- A dining area groups tables (e.g. "Indoor", "Outdoor", "VIP Room").
-- status: "active" | "inactive"
CREATE TABLE IF NOT EXISTS "dining_areas" (
  "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"   TEXT    NOT NULL DEFAULT 'default-store',
  "name"       TEXT    NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN NOT NULL DEFAULT 1,
  "created_at" TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "idx_dining_areas_store"
  ON "dining_areas"("store_id", "is_active");

-- ── dining_tables ─────────────────────────────────────────────────────────────
-- A physical or logical table within a dining area.
-- status: "available" | "occupied" | "reserved" | "cleaning"
-- capacity: number of seats
CREATE TABLE IF NOT EXISTS "dining_tables" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"    TEXT    NOT NULL DEFAULT 'default-store',
  "area_id"     INTEGER,
  "table_number" TEXT   NOT NULL,
  "capacity"    INTEGER NOT NULL DEFAULT 4,
  "status"      TEXT    NOT NULL DEFAULT 'available',
  "is_active"   BOOLEAN NOT NULL DEFAULT 1,
  "created_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("area_id") REFERENCES "dining_areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_table_number_store"
  ON "dining_tables"("store_id", "table_number");

CREATE INDEX IF NOT EXISTS "idx_dining_tables_store_status"
  ON "dining_tables"("store_id", "status");

CREATE INDEX IF NOT EXISTS "idx_dining_tables_area"
  ON "dining_tables"("area_id");

-- ── kitchen_tickets ───────────────────────────────────────────────────────────
-- A kitchen ticket is created when an order is confirmed.
-- One ticket per order (or per course if multi-course is enabled later).
-- status: "pending" | "preparing" | "ready" | "served" | "cancelled"
-- priority: "normal" | "rush" | "vip"
CREATE TABLE IF NOT EXISTS "kitchen_tickets" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id"    TEXT    NOT NULL DEFAULT 'default-store',
  "order_id"    INTEGER NOT NULL,
  "table_id"    INTEGER,
  "ticket_number" TEXT  NOT NULL,
  "status"      TEXT    NOT NULL DEFAULT 'pending',
  "priority"    TEXT    NOT NULL DEFAULT 'normal',
  "notes"       TEXT,
  "created_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  "ready_at"    TEXT,
  "served_at"   TEXT,
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("table_id") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_kitchen_ticket_number"
  ON "kitchen_tickets"("store_id", "ticket_number");

CREATE INDEX IF NOT EXISTS "idx_kitchen_tickets_store_status"
  ON "kitchen_tickets"("store_id", "status");

CREATE INDEX IF NOT EXISTS "idx_kitchen_tickets_order"
  ON "kitchen_tickets"("order_id");

-- ── kitchen_ticket_items ──────────────────────────────────────────────────────
-- One row per order item on a kitchen ticket.
-- status: "pending" | "preparing" | "ready" | "cancelled"
CREATE TABLE IF NOT EXISTS "kitchen_ticket_items" (
  "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "ticket_id"   INTEGER NOT NULL,
  "menu_id"     INTEGER NOT NULL,
  "name"        TEXT    NOT NULL,
  "qty"         INTEGER NOT NULL DEFAULT 1,
  "notes"       TEXT,
  "status"      TEXT    NOT NULL DEFAULT 'pending',
  "created_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  "updated_at"  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("ticket_id") REFERENCES "kitchen_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("menu_id")   REFERENCES "menu"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_kti_ticket"
  ON "kitchen_ticket_items"("ticket_id");

CREATE INDEX IF NOT EXISTS "idx_kti_menu"
  ON "kitchen_ticket_items"("menu_id");

-- ── Add table_id FK to orders ─────────────────────────────────────────────────
-- Nullable — non-F&B orders (pickup, delivery) leave this NULL.
ALTER TABLE "orders" ADD COLUMN "table_id" INTEGER REFERENCES "dining_tables"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_orders_table"
  ON "orders"("table_id");

-- ============================================================================
-- Backward compatibility notes
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. All existing orders get table_id = NULL — no F&B context.
-- 2. POS sale path is unaffected — table_id is optional in CreatePosSaleDto.
-- 3. Kitchen tickets are created by a separate service call after order creation.
--    They do NOT block the POS sale transaction.
--
-- ── PostgreSQL migration note ─────────────────────────────────────────────────
-- Replace INTEGER PRIMARY KEY AUTOINCREMENT with SERIAL or BIGSERIAL.
-- Add IF NOT EXISTS to all CREATE TABLE / CREATE INDEX.
-- ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "table_id" INTEGER REFERENCES ...
-- ============================================================================
