import { StoreTier } from '@libs/contracts/src/enums';

export const BusinessVertical = {
  GENERAL: 'general',
  RETAIL: 'retail',
  GROCERY_MINIMARKET: 'grocery_minimarket',
  RESTAURANT_CAFE: 'restaurant_cafe',
  WHOLESALE_DISTRIBUTION: 'wholesale_distribution',
  WAREHOUSE_LOGISTICS: 'warehouse_logistics',
  ACCOMMODATION_HOTEL: 'accommodation_hotel',
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

  ACCOMMODATION_RESERVATIONS: 'accommodation.reservations',
  ACCOMMODATION_ROOMS: 'accommodation.rooms',
  ACCOMMODATION_CHECKIN: 'accommodation.checkin',
  ACCOMMODATION_HOUSEKEEPING: 'accommodation.housekeeping',
  ACCOMMODATION_GUEST_SERVICES: 'accommodation.guest_services',
  ACCOMMODATION_AMENITIES_INVENTORY:
    'accommodation.amenities_inventory',

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

  // Gated by subscription tier (see TIER_MODULES below), not business
  // vertical — every one of these is a capability the pricing page sells,
  // not a vertical-specific workflow. Unlike the groups above, these are
  // NOT included in any VERTICAL_MODULES/PRESET_MODULES entry, so adding
  // them here changes nothing until TIER_MODULES/getCapabilities also read
  // a store's tier — this const alone is additive.
  POS_SPLIT_PAYMENT: 'tier.split_payment',
  POS_SHIFT_APPROVAL: 'tier.shift_approval',
  INVENTORY_MULTI_LOCATION: 'tier.multi_location_inventory',
  REPORTS_ADVANCED_ANALYTICS: 'tier.advanced_analytics',
  REPORTS_CSV_EXPORT: 'tier.csv_export',
  OPERATIONS_PURCHASE_ORDER: 'tier.purchase_order',
  CHATBOT_ORDERING: 'tier.chatbot_ordering',
  CHATBOT_NUTRITION_ASSISTANT: 'tier.chatbot_nutrition_assistant',
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
  [BusinessVertical.ACCOMMODATION_HOTEL]: [
    PlatformModule.ACCOMMODATION_RESERVATIONS,
    PlatformModule.ACCOMMODATION_ROOMS,
    PlatformModule.ACCOMMODATION_CHECKIN,
    PlatformModule.ACCOMMODATION_HOUSEKEEPING,
    PlatformModule.ACCOMMODATION_GUEST_SERVICES,
    PlatformModule.ACCOMMODATION_AMENITIES_INVENTORY,
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

// ── Subscription tier → module mapping ───────────────────────────────────────
// Matches apps/pos-web/landing-page's pricing page feature checklists as of
// 2026-08-26. Starter gets nothing beyond core + vertical defaults; each
// tier above includes everything the one below it has, plus its own row.
//
// NOT covered here, on purpose — flagged instead of guessed:
//   - "Invoice B2B" (Enterprise-only per pricing) is currently core.invoices,
//     always on for every tier today. Reclassifying it would take invoicing
//     away from existing Starter/Business stores already using it — a real
//     behavior change, not an additive one, so it needs a product decision
//     before touching it.
//   - Split payment / shift approval are enforced inside pos-sales.service.ts
//     / register.service.ts / pos-approval.service.ts, not behind a route
//     guard — the module keys exist so getCapabilities() can report them,
//     but nothing reads POS_SPLIT_PAYMENT/POS_SHIFT_APPROVAL yet. Wiring
//     that up means editing money-handling transaction logic, deliberately
//     done as its own separate, carefully-reviewed change.
//   - Chatbot ordering/nutrition assistant: the WhatsApp bot is single-tenant
//     today (see the SEC-11 roadmap note in checkout.service.ts) — it can't
//     yet tell which store's tier applies. Enforcement is blocked on that,
//     not on this mapping.
export const TIER_MODULES: Record<StoreTier, readonly PlatformModuleValue[]> = {
  starter: [],
  business: [
    PlatformModule.POS_SPLIT_PAYMENT,
    PlatformModule.POS_SHIFT_APPROVAL,
    PlatformModule.INVENTORY_MULTI_LOCATION,
    PlatformModule.REPORTS_ADVANCED_ANALYTICS,
    PlatformModule.CHATBOT_ORDERING,
    PlatformModule.CHATBOT_NUTRITION_ASSISTANT,
  ],
  enterprise: [
    PlatformModule.POS_SPLIT_PAYMENT,
    PlatformModule.POS_SHIFT_APPROVAL,
    PlatformModule.INVENTORY_MULTI_LOCATION,
    PlatformModule.REPORTS_ADVANCED_ANALYTICS,
    PlatformModule.CHATBOT_ORDERING,
    PlatformModule.CHATBOT_NUTRITION_ASSISTANT,
    PlatformModule.REPORTS_CSV_EXPORT,
    PlatformModule.OPERATIONS_PURCHASE_ORDER,
  ],
};

export const BusinessPreset = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  RETAIL_STORE: 'retail_store',
  ACCOMMODATION: 'accommodation',
  BUILDING_MATERIALS: 'building_materials',
} as const;

export type BusinessPresetValue =
  (typeof BusinessPreset)[keyof typeof BusinessPreset];

export const BUSINESS_PRESET_VALUES = Object.values(
  BusinessPreset,
) as BusinessPresetValue[];

export const BUSINESS_PRESET_TO_VERTICAL = {
  [BusinessPreset.RESTAURANT]: BusinessVertical.RESTAURANT_CAFE,
  [BusinessPreset.CAFE]: BusinessVertical.RESTAURANT_CAFE,
  [BusinessPreset.RETAIL_STORE]: BusinessVertical.RETAIL,
  [BusinessPreset.ACCOMMODATION]: BusinessVertical.ACCOMMODATION_HOTEL,
  [BusinessPreset.BUILDING_MATERIALS]:
    BusinessVertical.CONSTRUCTION_MATERIALS,
} as const satisfies Record<BusinessPresetValue, BusinessVerticalValue>;

export const PRESET_MODULES = {
  [BusinessPreset.RESTAURANT]: [
    PlatformModule.FNB_TABLES,
    PlatformModule.FNB_KDS,
    PlatformModule.FNB_RECIPES,
    PlatformModule.FNB_RAW_INGREDIENTS,
    PlatformModule.FNB_MODIFIERS,
    PlatformModule.FNB_DINE_IN,
  ],
  [BusinessPreset.CAFE]: [
    PlatformModule.FNB_RECIPES,
    PlatformModule.FNB_RAW_INGREDIENTS,
    PlatformModule.FNB_MODIFIERS,
  ],
  [BusinessPreset.RETAIL_STORE]: [
    PlatformModule.RETAIL_BARCODE,
    PlatformModule.RETAIL_VARIANTS,
    PlatformModule.RETAIL_STOCK_OPNAME,
    PlatformModule.RETAIL_PRICE_LABELS,
    PlatformModule.RETAIL_EXCHANGES,
  ],
  [BusinessPreset.ACCOMMODATION]: [
    PlatformModule.ACCOMMODATION_RESERVATIONS,
    PlatformModule.ACCOMMODATION_ROOMS,
    PlatformModule.ACCOMMODATION_CHECKIN,
    PlatformModule.ACCOMMODATION_HOUSEKEEPING,
    PlatformModule.ACCOMMODATION_GUEST_SERVICES,
    PlatformModule.ACCOMMODATION_AMENITIES_INVENTORY,
  ],
  [BusinessPreset.BUILDING_MATERIALS]: [
    PlatformModule.CONSTRUCTION_UNIT_CONVERSION,
    PlatformModule.CONSTRUCTION_PROJECT_REFERENCE,
    PlatformModule.CONSTRUCTION_DELIVERY_SCHEDULE,
    PlatformModule.CONSTRUCTION_BULK_STOCK,
    PlatformModule.RETAIL_BARCODE,
    PlatformModule.WAREHOUSE_LOCATIONS,
    PlatformModule.WAREHOUSE_TRANSFER,
  ],
} as const satisfies Record<
  BusinessPresetValue,
  readonly PlatformModuleValue[]
>;

export interface StoreCapabilitiesResponse {
  storeId: string;
  tier: StoreTier;
  businessVertical: BusinessVerticalValue;
  businessPreset: BusinessPresetValue | null;
  requestedBusinessVertical: BusinessVerticalValue | null;
  verificationStatus: StoreVerificationStatusValue;
  enabledModules: PlatformModuleValue[];
  coreModules: PlatformModuleValue[];
  verticalModules: PlatformModuleValue[];
  tierModules: PlatformModuleValue[];
}
