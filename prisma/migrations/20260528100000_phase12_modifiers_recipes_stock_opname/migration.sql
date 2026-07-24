-- Phase 12: Modifiers, Recipes/BOM, and Stock Opname
--
-- Adds three new domains:
--   1. Modifiers (modifier_groups + modifier_options + product_modifier_links)
--      → For F&B menu add-ons (toppings, spice level, etc.)
--   2. Recipes / BOM (recipes + recipe_ingredients)
--      → Maps a finished menu item to raw ingredients (menu rows with
--        product_type = "material"). Used by F&B and any vertical that
--        needs cost-of-goods or material consumption tracking.
--   3. Stock Opname (stock_opname_sessions + stock_opname_lines)
--      → Physical-count sessions that post variance to the inventory ledger
--        as ADJUSTMENT movements when posted.
--
-- All tables are additive — no existing tables are altered.

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selection_type" TEXT NOT NULL DEFAULT 'single',
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_select" INTEGER NOT NULL DEFAULT 0,
    "max_select" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta" REAL NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "product_modifier_links" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "product_modifier_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "product_modifier_links_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "menu_id" INTEGER NOT NULL,
    "yield_qty" REAL NOT NULL DEFAULT 1,
    "yield_unit" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "recipes_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "recipe_id" INTEGER NOT NULL,
    "ingredient_menu_id" INTEGER NOT NULL,
    "qty" REAL NOT NULL,
    "unit_code" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "recipe_ingredients_ingredient_menu_id_fkey" FOREIGN KEY ("ingredient_menu_id") REFERENCES "menu" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- CreateTable
CREATE TABLE "stock_opname_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_number" TEXT NOT NULL,
    "store_id" TEXT NOT NULL DEFAULT 'default-store',
    "location_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "submitted_at" TEXT,
    "posted_at" TEXT,
    "posted_by" TEXT,
    "cancelled_at" TEXT,
    "cancelled_by" TEXT,
    "cancelled_reason" TEXT,
    "total_variance_qty" INTEGER NOT NULL DEFAULT 0,
    "total_variance_value" REAL NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')'
);

-- CreateTable
CREATE TABLE "stock_opname_lines" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "product_name" TEXT NOT NULL,
    "system_qty" INTEGER NOT NULL,
    "counted_qty" INTEGER,
    "variance_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" REAL,
    "variance_value" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    "updated_at" TEXT NOT NULL DEFAULT 'datetime(''now'')',
    CONSTRAINT "stock_opname_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stock_opname_sessions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "stock_opname_lines_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX "idx_modifier_groups_store_active" ON "modifier_groups"("store_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_modifier_options_group" ON "modifier_options"("group_id");

-- CreateIndex
CREATE INDEX "idx_product_modifier_links_menu" ON "product_modifier_links"("menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_product_modifier_link" ON "product_modifier_links"("menu_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_menu_id_key" ON "recipes"("menu_id");

-- CreateIndex
CREATE INDEX "idx_recipes_menu" ON "recipes"("menu_id");

-- CreateIndex
CREATE INDEX "idx_recipe_ingredients_recipe" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "idx_recipe_ingredients_ingredient" ON "recipe_ingredients"("ingredient_menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_opname_sessions_session_number_key" ON "stock_opname_sessions"("session_number");

-- CreateIndex
CREATE INDEX "idx_stock_opname_store_status" ON "stock_opname_sessions"("store_id", "status");

-- CreateIndex
CREATE INDEX "idx_stock_opname_created" ON "stock_opname_sessions"("created_at");

-- CreateIndex
CREATE INDEX "idx_stock_opname_lines_session" ON "stock_opname_lines"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_stock_opname_session_menu" ON "stock_opname_lines"("session_id", "menu_id");
