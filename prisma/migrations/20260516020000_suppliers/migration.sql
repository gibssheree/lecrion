CREATE TABLE "suppliers" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL DEFAULT 'default-store',
  "name" TEXT NOT NULL,
  "code" TEXT,
  "contact_person" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "tax_number" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX "uniq_supplier_store_code" ON "suppliers"("store_id", "code");
CREATE INDEX "idx_suppliers_store_active" ON "suppliers"("store_id", "is_active");
CREATE INDEX "idx_suppliers_name" ON "suppliers"("name");
