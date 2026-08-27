-- AlterTable
ALTER TABLE "pos_sales" ADD COLUMN "channel" TEXT DEFAULT 'in_store';
ALTER TABLE "pos_sales" ADD COLUMN "courier_name" TEXT;
ALTER TABLE "pos_sales" ADD COLUMN "external_order_id" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_kitchen_ticket_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticket_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "kitchen_ticket_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "kitchen_tickets" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_kitchen_ticket_items" ("created_at", "id", "menu_id", "name", "notes", "qty", "status", "ticket_id", "updated_at") SELECT "created_at", "id", "menu_id", "name", "notes", "qty", "status", "ticket_id", "updated_at" FROM "kitchen_ticket_items";
DROP TABLE "kitchen_ticket_items";
ALTER TABLE "new_kitchen_ticket_items" RENAME TO "kitchen_ticket_items";
CREATE INDEX "idx_kti_ticket" ON "kitchen_ticket_items"("ticket_id");
CREATE INDEX "idx_kti_menu" ON "kitchen_ticket_items"("menu_id");
CREATE TABLE "new_menu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "cost_price" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "image_url" TEXT,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "sku" TEXT,
    "barcode" TEXT,
    "product_type" TEXT NOT NULL DEFAULT 'simple',
    "unit_name" TEXT,
    "unit_code" TEXT,
    "brand" TEXT,
    "supplier_name" TEXT,
    "supplier_id" TEXT,
    "attributes" TEXT,
    "parent_product_id" INTEGER,
    "is_stock_tracked" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category_id" INTEGER,
    CONSTRAINT "menu_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_menu" ("attributes", "barcode", "brand", "category_id", "cost_price", "description", "id", "image_url", "is_active", "is_stock_tracked", "name", "parent_product_id", "price", "product_type", "sku", "stock", "supplier_id", "supplier_name", "unit_code", "unit_name") SELECT "attributes", "barcode", "brand", "category_id", "cost_price", "description", "id", "image_url", "is_active", "is_stock_tracked", "name", "parent_product_id", "price", "product_type", "sku", "stock", "supplier_id", "supplier_name", "unit_code", "unit_name" FROM "menu";
DROP TABLE "menu";
ALTER TABLE "new_menu" RENAME TO "menu";
CREATE INDEX "idx_menu_stock" ON "menu"("stock");
CREATE INDEX "idx_menu_sku" ON "menu"("sku");
CREATE INDEX "idx_menu_barcode" ON "menu"("barcode");
CREATE INDEX "idx_menu_product_type" ON "menu"("product_type");
CREATE INDEX "idx_menu_active_tracked" ON "menu"("is_active", "is_stock_tracked");
CREATE INDEX "idx_menu_category_id" ON "menu"("category_id");
CREATE INDEX "idx_menu_store_active" ON "menu"("store_id", "is_active");
CREATE TABLE "new_operation_document_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "document_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_cost" REAL,
    "metadata" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "operation_document_lines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "operation_documents" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "operation_document_lines_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_operation_document_lines" ("created_at", "document_id", "id", "menu_id", "metadata", "qty", "unit_cost") SELECT "created_at", "document_id", "id", "menu_id", "metadata", "qty", "unit_cost" FROM "operation_document_lines";
DROP TABLE "operation_document_lines";
ALTER TABLE "new_operation_document_lines" RENAME TO "operation_document_lines";
CREATE INDEX "idx_op_doc_line_document" ON "operation_document_lines"("document_id");
CREATE INDEX "idx_op_doc_line_menu" ON "operation_document_lines"("menu_id");
CREATE TABLE "new_operation_documents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "document_number" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "source_location_id" INTEGER,
    "destination_location_id" INTEGER,
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "linked_document_id" INTEGER,
    "created_by" TEXT NOT NULL,
    "submitted_by" TEXT,
    "posted_by" TEXT,
    "cancelled_by" TEXT,
    "notes" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "submitted_at" TEXT,
    "posted_at" TEXT,
    "cancelled_at" TEXT
);
INSERT INTO "new_operation_documents" ("cancelled_at", "cancelled_by", "created_at", "created_by", "destination_location_id", "document_number", "document_type", "id", "linked_document_id", "notes", "posted_at", "posted_by", "source_location_id", "status", "store_id", "submitted_at", "submitted_by", "supplier_id", "supplier_name") SELECT "cancelled_at", "cancelled_by", "created_at", "created_by", "destination_location_id", "document_number", "document_type", "id", "linked_document_id", "notes", "posted_at", "posted_by", "source_location_id", "status", "store_id", "submitted_at", "submitted_by", "supplier_id", "supplier_name" FROM "operation_documents";
DROP TABLE "operation_documents";
ALTER TABLE "new_operation_documents" RENAME TO "operation_documents";
CREATE UNIQUE INDEX "operation_documents_document_number_key" ON "operation_documents"("document_number");
CREATE INDEX "idx_op_doc_store_type_status" ON "operation_documents"("store_id", "document_type", "status");
CREATE INDEX "idx_op_doc_type_status" ON "operation_documents"("document_type", "status");
CREATE INDEX "idx_op_doc_created" ON "operation_documents"("created_at" DESC);
CREATE INDEX "idx_op_doc_linked" ON "operation_documents"("linked_document_id");
CREATE TABLE "new_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT DEFAULT '',
    "address" TEXT DEFAULT '',
    "delivery_cost" INTEGER,
    "payment_method" TEXT DEFAULT 'Transfer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "estimated_time" INTEGER DEFAULT 15,
    "cancelled_at" TEXT,
    "cancellation_reason" TEXT,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "table_id" INTEGER,
    "customer_id" INTEGER,
    "channel" TEXT DEFAULT 'in_store',
    "external_order_id" TEXT,
    "courier_name" TEXT,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_tables" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_orders" ("address", "cancellation_reason", "cancelled_at", "created_at", "customer_id", "delivery_cost", "estimated_time", "id", "name", "payment_method", "phone", "status", "table_id", "type", "user_id") SELECT "address", "cancellation_reason", "cancelled_at", "created_at", "customer_id", "delivery_cost", "estimated_time", "id", "name", "payment_method", "phone", "status", "table_id", "type", "user_id" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE INDEX "idx_orders_user" ON "orders"("user_id");
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");
CREATE INDEX "idx_orders_status" ON "orders"("status");
CREATE INDEX "idx_orders_table" ON "orders"("table_id");
CREATE INDEX "idx_orders_customer" ON "orders"("customer_id");
CREATE INDEX "idx_orders_store_status" ON "orders"("store_id", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "idx_customers_phone" ON "customers"("phone");

-- RedefineIndex
DROP INDEX "uniq_product_barcode";
CREATE UNIQUE INDEX "product_barcodes_barcode_key" ON "product_barcodes"("barcode");
