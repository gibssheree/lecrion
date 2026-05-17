-- CreateTable
CREATE TABLE "admins" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "before_value" TEXT,
    "after_value" TEXT,
    "tenant_id" TEXT NOT NULL DEFAULT 'default',
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "correlation_id" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'api',
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sender" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "menu" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "carts" (
    "sender" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "cash_register_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "cashier_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "opening_cash" REAL NOT NULL DEFAULT 0,
    "expected_cash" REAL NOT NULL DEFAULT 0,
    "counted_cash" REAL,
    "variance" REAL,
    "notes" TEXT,
    "opened_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "closed_at" TEXT
);

-- CreateTable
CREATE TABLE "cashflow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "actor_id" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "cashflow_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "entry_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'Cash',
    "reference_type" TEXT,
    "reference_id" TEXT,
    "category" TEXT,
    "note" TEXT,
    "operator_id" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "chat_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sender" TEXT NOT NULL,
    "name" TEXT,
    "question" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'chat',
    "cart_items" TEXT,
    "total_price" REAL,
    "order_id" INTEGER,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "favorites_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "result" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "expires_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "menu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "image_url" TEXT
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "order_id" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "order_items_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "order_ratings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "order_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "order_ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "orders" (
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
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "amount" REAL NOT NULL,
    "paid_amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "payment_method" TEXT NOT NULL DEFAULT 'Cash',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "read_model_snapshots" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "data" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "projection" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "built_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "stock_change_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_id" INTEGER NOT NULL,
    "admin_id" INTEGER,
    "order_id" INTEGER,
    "change_type" TEXT NOT NULL,
    "qty_before" INTEGER NOT NULL,
    "qty_change" INTEGER NOT NULL,
    "qty_after" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "stock_change_logs_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "store_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "sync_outbox" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "next_attempt_at" TEXT,
    "last_error" TEXT
);

-- CreateTable
CREATE TABLE "sync_inbox" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "source_outbox_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT
);

-- CreateTable
CREATE TABLE "webhook_dedupes" (
    "dedupe_key" TEXT NOT NULL PRIMARY KEY,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_admins_1" ON "admins"("email");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "audit_logs"("actor");

-- CreateIndex
CREATE INDEX "idx_cart_sender" ON "cart_items"("sender");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_cart_items_1" ON "cart_items"("sender", "product_id");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_register_store" ON "cash_register_sessions"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_cashflow_created" ON "cashflow_entries"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cashflow_session" ON "cashflow_entries"("session_id");

-- CreateIndex
CREATE INDEX "idx_chat_created_at" ON "chat_history"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_chat_sender" ON "chat_history"("sender");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_favorites_1" ON "favorites"("user_id", "menu_id");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE INDEX "idx_menu_stock" ON "menu"("stock");

-- CreateIndex
CREATE INDEX "idx_order_items_menu" ON "order_items"("menu_id");

-- CreateIndex
CREATE INDEX "idx_order_items_order" ON "order_items"("order_id");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_order_ratings_1" ON "order_ratings"("order_id");
Pragma writable_schema=0;

-- CreateIndex
CREATE INDEX "idx_orders_user" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_order" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_scl_created" ON "stock_change_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_scl_menu_created" ON "stock_change_logs"("menu_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_inbox_created" ON "sync_inbox"("created_at");

-- CreateIndex
CREATE INDEX "idx_inbox_status" ON "sync_inbox"("status");

-- CreateIndex
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_users_1" ON "users"("email");
Pragma writable_schema=0;
