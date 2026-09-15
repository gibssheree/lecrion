-- Accommodation front office foundation: rooms, reservations, stays, folios, housekeeping.
ALTER TABLE "pos_sales" ADD COLUMN "folio_id" INTEGER;
CREATE INDEX "idx_pos_sales_folio" ON "pos_sales"("folio_id");

CREATE TABLE "accommodation_room_types" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "capacity" INTEGER NOT NULL DEFAULT 2,
  "base_rate" REAL NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX "uniq_accommodation_room_type_code" ON "accommodation_room_types"("store_id", "code");
CREATE INDEX "idx_accommodation_room_types_store" ON "accommodation_room_types"("store_id", "is_active");

CREATE TABLE "accommodation_rooms" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "room_type_id" INTEGER NOT NULL,
  "room_number" TEXT NOT NULL,
  "floor" TEXT,
  "status" TEXT NOT NULL DEFAULT 'vacant',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "accommodation_room_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "uniq_accommodation_room_number" ON "accommodation_rooms"("store_id", "room_number");
CREATE INDEX "idx_accommodation_rooms_store_status" ON "accommodation_rooms"("store_id", "status");
CREATE INDEX "idx_accommodation_rooms_type" ON "accommodation_rooms"("room_type_id");

CREATE TABLE "accommodation_reservations" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "reservation_number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'tentative',
  "customer_id" INTEGER,
  "room_type_id" INTEGER NOT NULL,
  "room_id" INTEGER,
  "check_in_date" TEXT NOT NULL,
  "check_out_date" TEXT NOT NULL,
  "adults" INTEGER NOT NULL DEFAULT 1,
  "children" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'direct',
  "rate" REAL NOT NULL DEFAULT 0,
  "deposit_amount" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_reservations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "accommodation_reservations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "accommodation_room_types" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "accommodation_reservations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "accommodation_rooms" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "accommodation_reservations_reservation_number_key" ON "accommodation_reservations"("reservation_number");
CREATE INDEX "idx_accommodation_reservations_store_status" ON "accommodation_reservations"("store_id", "status");
CREATE INDEX "idx_accommodation_reservations_dates" ON "accommodation_reservations"("store_id", "check_in_date", "check_out_date");
CREATE INDEX "idx_accommodation_reservations_customer" ON "accommodation_reservations"("customer_id");

CREATE TABLE "accommodation_reservation_guests" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "reservation_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "identity_type" TEXT,
  "identity_number" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_reservation_guests_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "accommodation_reservations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "idx_accommodation_reservation_guests" ON "accommodation_reservation_guests"("reservation_id");

CREATE TABLE "accommodation_stays" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "reservation_id" INTEGER,
  "room_id" INTEGER NOT NULL,
  "primary_guest_name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'expected',
  "actual_check_in_at" TEXT,
  "actual_check_out_at" TEXT,
  "expected_check_out" TEXT NOT NULL,
  "notes" TEXT,
  "checked_in_by" TEXT,
  "checked_out_by" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_stays_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "accommodation_reservations" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "accommodation_stays_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "accommodation_rooms" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "idx_accommodation_stays_store_status" ON "accommodation_stays"("store_id", "status");
CREATE INDEX "idx_accommodation_stays_room_status" ON "accommodation_stays"("room_id", "status");

CREATE TABLE "accommodation_folios" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "folio_number" TEXT NOT NULL,
  "reservation_id" INTEGER,
  "stay_id" INTEGER,
  "customer_id" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'open',
  "subtotal" REAL NOT NULL DEFAULT 0,
  "discount" REAL NOT NULL DEFAULT 0,
  "tax" REAL NOT NULL DEFAULT 0,
  "service_charge" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "paid_amount" REAL NOT NULL DEFAULT 0,
  "balance_due" REAL NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_folios_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "accommodation_reservations" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "accommodation_folios_stay_id_fkey" FOREIGN KEY ("stay_id") REFERENCES "accommodation_stays" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "accommodation_folios_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "accommodation_folios_folio_number_key" ON "accommodation_folios"("folio_number");
CREATE INDEX "idx_accommodation_folios_store_status" ON "accommodation_folios"("store_id", "status");
CREATE INDEX "idx_accommodation_folios_stay" ON "accommodation_folios"("stay_id");

CREATE TABLE "accommodation_folio_items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "folio_id" INTEGER NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "description" TEXT NOT NULL,
  "quantity" REAL NOT NULL DEFAULT 1,
  "unit_price" REAL NOT NULL DEFAULT 0,
  "discount" REAL NOT NULL DEFAULT 0,
  "tax" REAL NOT NULL DEFAULT 0,
  "total" REAL NOT NULL DEFAULT 0,
  "posted_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
  "posted_by" TEXT,
  CONSTRAINT "accommodation_folio_items_folio_id_fkey" FOREIGN KEY ("folio_id") REFERENCES "accommodation_folios" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "idx_accommodation_folio_items" ON "accommodation_folio_items"("folio_id", "posted_at");
CREATE INDEX "idx_accommodation_folio_source" ON "accommodation_folio_items"("source_type", "source_id");

CREATE TABLE "accommodation_housekeeping_tasks" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "room_id" INTEGER NOT NULL,
  "task_type" TEXT NOT NULL DEFAULT 'cleaning',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "assigned_to" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "accommodation_housekeeping_tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "accommodation_rooms" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE INDEX "idx_accommodation_housekeeping_store_status" ON "accommodation_housekeeping_tasks"("store_id", "status");
CREATE INDEX "idx_accommodation_housekeeping_room_status" ON "accommodation_housekeeping_tasks"("room_id", "status");

