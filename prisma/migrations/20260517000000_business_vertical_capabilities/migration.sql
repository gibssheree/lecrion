CREATE TABLE "business_verticals" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "platform_modules" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "description" TEXT,
  "is_core" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX "idx_platform_modules_group" ON "platform_modules"("group", "is_active");
CREATE INDEX "idx_platform_modules_core" ON "platform_modules"("is_core", "is_active");

CREATE TABLE "business_vertical_modules" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "vertical_key" TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX "uniq_vertical_module" ON "business_vertical_modules"("vertical_key", "module_key");
CREATE INDEX "idx_bvm_vertical" ON "business_vertical_modules"("vertical_key");
CREATE INDEX "idx_bvm_module" ON "business_vertical_modules"("module_key");

CREATE TABLE "store_business_profiles" (
  "store_id" TEXT NOT NULL PRIMARY KEY,
  "requested_business_vertical" TEXT,
  "verified_business_vertical" TEXT NOT NULL DEFAULT 'general',
  "verification_status" TEXT NOT NULL DEFAULT 'unverified',
  "verified_by" TEXT,
  "verified_at" TEXT,
  "notes" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "store_module_overrides" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "store_id" TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "reason" TEXT,
  "updated_by" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX "uniq_store_module_override" ON "store_module_overrides"("store_id", "module_key");
CREATE INDEX "idx_store_module_overrides_store" ON "store_module_overrides"("store_id");
CREATE INDEX "idx_store_module_overrides_module" ON "store_module_overrides"("module_key");

INSERT INTO "business_verticals" ("key", "name", "description") VALUES
('general', 'General / Mixed Business', 'Fallback for unclear or mixed businesses'),
('retail', 'Retail Store', 'Barcode, variants, shelf stock, and customer sales'),
('grocery_minimarket', 'Grocery / Minimarket', 'Fast checkout, reorder alerts, batch and expiry workflows'),
('restaurant_cafe', 'Restaurant / Cafe', 'Tables, KDS, recipes, raw ingredients, and dine-in workflows'),
('wholesale_distribution', 'Wholesale / Distribution', 'Bulk orders, customer pricing, delivery orders, and receivables'),
('warehouse_logistics', 'Warehouse / Logistics', 'Locations, receiving, picking, packing, dispatch, and transfers'),
('manufacturing', 'Manufacturing / Production', 'BOM, production order, raw material issue, and finished goods'),
('construction_materials', 'Building Materials / Project Supply', 'Unit conversion, project jobs, delivery scheduling, and bulky stock'),
('service_repair', 'Services / Repair Shop', 'Work orders, appointments, technicians, spare parts, and service invoices'),
('health_wellness', 'Health / Wellness', 'Appointments, customer profiles, services, and restricted inventory foundations');

INSERT INTO "platform_modules" ("key", "name", "group", "is_core") VALUES
('core.dashboard', 'Dashboard', 'core', true),
('core.pos', 'POS / Kasir', 'core', true),
('core.sales', 'Sales / Orders', 'core', true),
('core.inventory', 'Inventory', 'core', true),
('core.invoices', 'Invoices', 'core', true),
('core.payments', 'Payments / Cashflow', 'core', true),
('core.reports', 'Reports / Analysis', 'core', true),
('core.customers', 'Customers', 'core', true),
('core.suppliers', 'Suppliers', 'core', true),
('core.users', 'Users / Roles', 'core', true),
('core.settings', 'Settings', 'core', true),
('fnb.tables', 'Tables', 'fnb', false),
('fnb.kds', 'KDS / Kitchen', 'fnb', false),
('fnb.recipes', 'Recipes / BOM', 'fnb', false),
('fnb.raw_ingredients', 'Raw Ingredients', 'fnb', false),
('fnb.modifiers', 'Menu Modifiers', 'fnb', false),
('fnb.dine_in', 'Dine In', 'fnb', false),
('retail.barcode', 'Barcode', 'retail', false),
('retail.variants', 'Variants', 'retail', false),
('retail.stock_opname', 'Stock Opname', 'retail', false),
('retail.price_labels', 'Price Labels', 'retail', false),
('retail.exchanges', 'Returns / Exchange', 'retail', false),
('grocery.fast_checkout', 'Fast Checkout', 'grocery', false),
('grocery.expiry_tracking', 'Expiry Tracking', 'grocery', false),
('grocery.batch_stock', 'Batch Stock', 'grocery', false),
('grocery.reorder_alerts', 'Reorder Alerts', 'grocery', false),
('wholesale.customer_pricing', 'Customer Pricing', 'wholesale', false),
('wholesale.bulk_order', 'Bulk Orders', 'wholesale', false),
('wholesale.delivery_order', 'Delivery Order', 'wholesale', false),
('wholesale.receivables', 'Receivables', 'wholesale', false),
('warehouse.locations', 'Warehouse Locations', 'warehouse', false),
('warehouse.branch_cluster', 'Branch / Cluster', 'warehouse', false),
('warehouse.receiving', 'Receiving', 'warehouse', false),
('warehouse.picking', 'Picking', 'warehouse', false),
('warehouse.packing', 'Packing', 'warehouse', false),
('warehouse.dispatch', 'Dispatch', 'warehouse', false),
('warehouse.transfer', 'Transfers', 'warehouse', false),
('manufacturing.bom', 'BOM', 'manufacturing', false),
('manufacturing.production_order', 'Production Orders', 'manufacturing', false),
('manufacturing.material_issue', 'Material Issue', 'manufacturing', false),
('manufacturing.finished_goods', 'Finished Goods', 'manufacturing', false),
('manufacturing.variance', 'Production Variance', 'manufacturing', false),
('construction.unit_conversion', 'Unit Conversion', 'construction', false),
('construction.project_reference', 'Project Jobs', 'construction', false),
('construction.delivery_schedule', 'Delivery Schedule', 'construction', false),
('construction.bulk_stock', 'Bulk Stock', 'construction', false),
('service.work_order', 'Work Orders', 'service', false),
('service.appointment', 'Appointments', 'service', false),
('service.technician', 'Technicians', 'service', false),
('service.spare_parts', 'Spare Parts', 'service', false),
('service.service_invoice', 'Service Invoice', 'service', false),
('health.appointment', 'Appointments', 'health', false),
('health.customer_profile', 'Customer Profile', 'health', false),
('health.service_catalog', 'Services', 'health', false),
('health.product_retail', 'Product Retail', 'health', false),
('health.restricted_inventory', 'Restricted Inventory', 'health', false);

INSERT INTO "business_vertical_modules" ("vertical_key", "module_key") VALUES
('restaurant_cafe', 'fnb.tables'),
('restaurant_cafe', 'fnb.kds'),
('restaurant_cafe', 'fnb.recipes'),
('restaurant_cafe', 'fnb.raw_ingredients'),
('restaurant_cafe', 'fnb.modifiers'),
('restaurant_cafe', 'fnb.dine_in'),
('retail', 'retail.barcode'),
('retail', 'retail.variants'),
('retail', 'retail.stock_opname'),
('retail', 'retail.price_labels'),
('retail', 'retail.exchanges'),
('grocery_minimarket', 'grocery.fast_checkout'),
('grocery_minimarket', 'grocery.expiry_tracking'),
('grocery_minimarket', 'grocery.batch_stock'),
('grocery_minimarket', 'grocery.reorder_alerts'),
('grocery_minimarket', 'retail.barcode'),
('grocery_minimarket', 'retail.stock_opname'),
('wholesale_distribution', 'wholesale.customer_pricing'),
('wholesale_distribution', 'wholesale.bulk_order'),
('wholesale_distribution', 'wholesale.delivery_order'),
('wholesale_distribution', 'wholesale.receivables'),
('warehouse_logistics', 'warehouse.locations'),
('warehouse_logistics', 'warehouse.branch_cluster'),
('warehouse_logistics', 'warehouse.receiving'),
('warehouse_logistics', 'warehouse.picking'),
('warehouse_logistics', 'warehouse.packing'),
('warehouse_logistics', 'warehouse.dispatch'),
('warehouse_logistics', 'warehouse.transfer'),
('manufacturing', 'manufacturing.bom'),
('manufacturing', 'manufacturing.production_order'),
('manufacturing', 'manufacturing.material_issue'),
('manufacturing', 'manufacturing.finished_goods'),
('manufacturing', 'manufacturing.variance'),
('construction_materials', 'construction.unit_conversion'),
('construction_materials', 'construction.project_reference'),
('construction_materials', 'construction.delivery_schedule'),
('construction_materials', 'construction.bulk_stock'),
('service_repair', 'service.work_order'),
('service_repair', 'service.appointment'),
('service_repair', 'service.technician'),
('service_repair', 'service.spare_parts'),
('service_repair', 'service.service_invoice'),
('health_wellness', 'health.appointment'),
('health_wellness', 'health.customer_profile'),
('health_wellness', 'health.service_catalog'),
('health_wellness', 'health.product_retail'),
('health_wellness', 'health.restricted_inventory');

INSERT INTO "store_business_profiles" (
  "store_id",
  "requested_business_vertical",
  "verified_business_vertical",
  "verification_status",
  "verified_by",
  "verified_at",
  "notes"
)
VALUES (
  'default-store',
  NULL,
  CASE COALESCE(
    (SELECT "value" FROM "store_settings" WHERE "key" = 'default-store:businessVertical'),
    (SELECT "value" FROM "store_settings" WHERE "key" = 'default-store:businessType'),
    (SELECT "value" FROM "store_settings" WHERE "key" = 'businessVertical'),
    (SELECT "value" FROM "store_settings" WHERE "key" = 'businessType'),
    'general'
  )
    WHEN 'restaurant' THEN 'restaurant_cafe'
    WHEN 'cafe' THEN 'restaurant_cafe'
    WHEN 'service' THEN 'service_repair'
    WHEN 'retail' THEN 'retail'
    WHEN 'grocery_minimarket' THEN 'grocery_minimarket'
    WHEN 'restaurant_cafe' THEN 'restaurant_cafe'
    WHEN 'wholesale_distribution' THEN 'wholesale_distribution'
    WHEN 'warehouse_logistics' THEN 'warehouse_logistics'
    WHEN 'manufacturing' THEN 'manufacturing'
    WHEN 'construction_materials' THEN 'construction_materials'
    WHEN 'service_repair' THEN 'service_repair'
    WHEN 'health_wellness' THEN 'health_wellness'
    ELSE 'general'
  END,
  'verified',
  'migration',
  datetime('now'),
  'Backfilled from store_settings businessType/businessVertical compatibility values.'
);
