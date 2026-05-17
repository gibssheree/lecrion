export const BusinessVertical = {
  GENERAL: 'general',
  RETAIL: 'retail',
  GROCERY_MINIMARKET: 'grocery_minimarket',
  RESTAURANT_CAFE: 'restaurant_cafe',
  WHOLESALE_DISTRIBUTION: 'wholesale_distribution',
  WAREHOUSE_LOGISTICS: 'warehouse_logistics',
  MANUFACTURING: 'manufacturing',
  CONSTRUCTION_MATERIALS: 'construction_materials',
  SERVICE_REPAIR: 'service_repair',
  HEALTH_WELLNESS: 'health_wellness',
} as const;

export type BusinessVerticalValue =
  (typeof BusinessVertical)[keyof typeof BusinessVertical];

export const BUSINESS_VERTICAL_VALUES = Object.values(
  BusinessVertical,
) as BusinessVerticalValue[];

export const StoreVerificationStatus = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type StoreVerificationStatusValue =
  (typeof StoreVerificationStatus)[keyof typeof StoreVerificationStatus];

export const PlatformModule = {
  CORE_DASHBOARD: 'core.dashboard',
  CORE_POS: 'core.pos',
  CORE_SALES: 'core.sales',
  CORE_INVENTORY: 'core.inventory',
  CORE_INVOICES: 'core.invoices',
  CORE_PAYMENTS: 'core.payments',
  CORE_REPORTS: 'core.reports',
  CORE_CUSTOMERS: 'core.customers',
  CORE_SUPPLIERS: 'core.suppliers',
  CORE_USERS: 'core.users',
  CORE_SETTINGS: 'core.settings',

  FNB_TABLES: 'fnb.tables',
  FNB_KDS: 'fnb.kds',
  FNB_RECIPES: 'fnb.recipes',
  FNB_RAW_INGREDIENTS: 'fnb.raw_ingredients',
  FNB_MODIFIERS: 'fnb.modifiers',
  FNB_DINE_IN: 'fnb.dine_in',

  RETAIL_BARCODE: 'retail.barcode',
  RETAIL_VARIANTS: 'retail.variants',
  RETAIL_STOCK_OPNAME: 'retail.stock_opname',
  RETAIL_PRICE_LABELS: 'retail.price_labels',
  RETAIL_EXCHANGES: 'retail.exchanges',

  GROCERY_FAST_CHECKOUT: 'grocery.fast_checkout',
  GROCERY_EXPIRY_TRACKING: 'grocery.expiry_tracking',
  GROCERY_BATCH_STOCK: 'grocery.batch_stock',
  GROCERY_REORDER_ALERTS: 'grocery.reorder_alerts',

  WHOLESALE_CUSTOMER_PRICING: 'wholesale.customer_pricing',
  WHOLESALE_BULK_ORDER: 'wholesale.bulk_order',
  WHOLESALE_DELIVERY_ORDER: 'wholesale.delivery_order',
  WHOLESALE_RECEIVABLES: 'wholesale.receivables',

  WAREHOUSE_LOCATIONS: 'warehouse.locations',
  WAREHOUSE_BRANCH_CLUSTER: 'warehouse.branch_cluster',
  WAREHOUSE_RECEIVING: 'warehouse.receiving',
  WAREHOUSE_PICKING: 'warehouse.picking',
  WAREHOUSE_PACKING: 'warehouse.packing',
  WAREHOUSE_DISPATCH: 'warehouse.dispatch',
  WAREHOUSE_TRANSFER: 'warehouse.transfer',

  MANUFACTURING_BOM: 'manufacturing.bom',
  MANUFACTURING_PRODUCTION_ORDER: 'manufacturing.production_order',
  MANUFACTURING_MATERIAL_ISSUE: 'manufacturing.material_issue',
  MANUFACTURING_FINISHED_GOODS: 'manufacturing.finished_goods',
  MANUFACTURING_VARIANCE: 'manufacturing.variance',

  CONSTRUCTION_UNIT_CONVERSION: 'construction.unit_conversion',
  CONSTRUCTION_PROJECT_REFERENCE: 'construction.project_reference',
  CONSTRUCTION_DELIVERY_SCHEDULE: 'construction.delivery_schedule',
  CONSTRUCTION_BULK_STOCK: 'construction.bulk_stock',

  SERVICE_WORK_ORDER: 'service.work_order',
  SERVICE_APPOINTMENT: 'service.appointment',
  SERVICE_TECHNICIAN: 'service.technician',
  SERVICE_SPARE_PARTS: 'service.spare_parts',
  SERVICE_SERVICE_INVOICE: 'service.service_invoice',

  HEALTH_APPOINTMENT: 'health.appointment',
  HEALTH_CUSTOMER_PROFILE: 'health.customer_profile',
  HEALTH_SERVICE_CATALOG: 'health.service_catalog',
  HEALTH_PRODUCT_RETAIL: 'health.product_retail',
  HEALTH_RESTRICTED_INVENTORY: 'health.restricted_inventory',
} as const;

export type PlatformModuleValue =
  (typeof PlatformModule)[keyof typeof PlatformModule];

export const CORE_MODULES = [
  PlatformModule.CORE_DASHBOARD,
  PlatformModule.CORE_POS,
  PlatformModule.CORE_SALES,
  PlatformModule.CORE_INVENTORY,
  PlatformModule.CORE_INVOICES,
  PlatformModule.CORE_PAYMENTS,
  PlatformModule.CORE_REPORTS,
  PlatformModule.CORE_CUSTOMERS,
  PlatformModule.CORE_SUPPLIERS,
  PlatformModule.CORE_USERS,
  PlatformModule.CORE_SETTINGS,
] as const satisfies readonly PlatformModuleValue[];

export const VERTICAL_MODULES: Record<
  BusinessVerticalValue,
  readonly PlatformModuleValue[]
> = {
  [BusinessVertical.GENERAL]: [],
  [BusinessVertical.RETAIL]: [
    PlatformModule.RETAIL_BARCODE,
    PlatformModule.RETAIL_VARIANTS,
    PlatformModule.RETAIL_STOCK_OPNAME,
    PlatformModule.RETAIL_PRICE_LABELS,
    PlatformModule.RETAIL_EXCHANGES,
  ],
  [BusinessVertical.GROCERY_MINIMARKET]: [
    PlatformModule.GROCERY_FAST_CHECKOUT,
    PlatformModule.GROCERY_EXPIRY_TRACKING,
    PlatformModule.GROCERY_BATCH_STOCK,
    PlatformModule.GROCERY_REORDER_ALERTS,
    PlatformModule.RETAIL_BARCODE,
    PlatformModule.RETAIL_STOCK_OPNAME,
  ],
  [BusinessVertical.RESTAURANT_CAFE]: [
    PlatformModule.FNB_TABLES,
    PlatformModule.FNB_KDS,
    PlatformModule.FNB_RECIPES,
    PlatformModule.FNB_RAW_INGREDIENTS,
    PlatformModule.FNB_MODIFIERS,
    PlatformModule.FNB_DINE_IN,
  ],
  [BusinessVertical.WHOLESALE_DISTRIBUTION]: [
    PlatformModule.WHOLESALE_CUSTOMER_PRICING,
    PlatformModule.WHOLESALE_BULK_ORDER,
    PlatformModule.WHOLESALE_DELIVERY_ORDER,
    PlatformModule.WHOLESALE_RECEIVABLES,
  ],
  [BusinessVertical.WAREHOUSE_LOGISTICS]: [
    PlatformModule.WAREHOUSE_LOCATIONS,
    PlatformModule.WAREHOUSE_BRANCH_CLUSTER,
    PlatformModule.WAREHOUSE_RECEIVING,
    PlatformModule.WAREHOUSE_PICKING,
    PlatformModule.WAREHOUSE_PACKING,
    PlatformModule.WAREHOUSE_DISPATCH,
    PlatformModule.WAREHOUSE_TRANSFER,
  ],
  [BusinessVertical.MANUFACTURING]: [
    PlatformModule.MANUFACTURING_BOM,
    PlatformModule.MANUFACTURING_PRODUCTION_ORDER,
    PlatformModule.MANUFACTURING_MATERIAL_ISSUE,
    PlatformModule.MANUFACTURING_FINISHED_GOODS,
    PlatformModule.MANUFACTURING_VARIANCE,
  ],
  [BusinessVertical.CONSTRUCTION_MATERIALS]: [
    PlatformModule.CONSTRUCTION_UNIT_CONVERSION,
    PlatformModule.CONSTRUCTION_PROJECT_REFERENCE,
    PlatformModule.CONSTRUCTION_DELIVERY_SCHEDULE,
    PlatformModule.CONSTRUCTION_BULK_STOCK,
  ],
  [BusinessVertical.SERVICE_REPAIR]: [
    PlatformModule.SERVICE_WORK_ORDER,
    PlatformModule.SERVICE_APPOINTMENT,
    PlatformModule.SERVICE_TECHNICIAN,
    PlatformModule.SERVICE_SPARE_PARTS,
    PlatformModule.SERVICE_SERVICE_INVOICE,
  ],
  [BusinessVertical.HEALTH_WELLNESS]: [
    PlatformModule.HEALTH_APPOINTMENT,
    PlatformModule.HEALTH_CUSTOMER_PROFILE,
    PlatformModule.HEALTH_SERVICE_CATALOG,
    PlatformModule.HEALTH_PRODUCT_RETAIL,
    PlatformModule.HEALTH_RESTRICTED_INVENTORY,
  ],
};

export interface StoreCapabilitiesResponse {
  storeId: string;
  businessVertical: BusinessVerticalValue;
  requestedBusinessVertical: BusinessVerticalValue | null;
  verificationStatus: StoreVerificationStatusValue;
  enabledModules: PlatformModuleValue[];
  coreModules: PlatformModuleValue[];
  verticalModules: PlatformModuleValue[];
}
