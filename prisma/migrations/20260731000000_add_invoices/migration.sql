-- Add invoices, invoice_lines, invoice_sequences
--
-- These tables exist in schema.prisma and are read/written by
-- apps/api/src/modules/invoices but were never captured by a migration
-- (they were added to dev databases via `prisma db push`). This migration
-- brings a fresh database created via `prisma migrate deploy` in line with
-- schema.prisma so invoicing works out of the box.

-- CreateTable
CREATE TABLE "invoices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "order_id" INTEGER,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "customer_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "payment_terms" TEXT NOT NULL DEFAULT 'cod',
    "issue_date" TEXT NOT NULL,
    "due_date" TEXT,
    "paid_date" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoice_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL,
    "business_date" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_store_status" ON "invoices"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_invoices_created" ON "invoices"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_invoices_order" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_invoice" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_invoice_seq_scope" ON "invoice_sequences"("store_id", "business_date");

-- CreateIndex
CREATE INDEX "idx_invoice_seq_date" ON "invoice_sequences"("business_date");
