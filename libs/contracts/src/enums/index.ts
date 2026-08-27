// libs/contracts/src/enums/index.ts
// Canonical domain enumerations — single source of truth for all apps.
// Import from here; never define status strings inline in services or UI.

export type UserRole =
  | "owner"
  | "manager"
  | "cashier"
  | "inventory_staff"
  | "support"
  | "bot_service"
  | "worker_service"
  | "llm_service";

// ── Subscription tier ────────────────────────────────────────────────────────
// The store's paid plan (Starter / Business / Enterprise on the pricing page),
// gating feature access. Unrelated to `customers.tier` (loyalty tier, e.g.
// regular/silver/gold/platinum) — same word, different concept, do not conflate.
export type StoreTier = "starter" | "business" | "enterprise";
export const STORE_TIERS: StoreTier[] = ["starter", "business", "enterprise"];
export const DEFAULT_STORE_TIER: StoreTier = "starter";

// Numeric limits per tier, matching the pricing page as of 2026-08-26.
// "maxStaffAccounts" counts every non-support user row under a store_id,
// owner included (matches how the pricing page counted it: Starter's "Maks
// 3" was spelled out as "owner + 2 staf").
//
// maxOutlets is carried here for completeness (and because the pricing page
// sells it) but nothing enforces it today — there is no feature yet for one
// account to own more than one store_id, so there is nothing to cap. Don't
// wire a check against this field until that feature exists; a limit on an
// action nobody can take enforces nothing.
export interface TierLimits {
  maxOutlets: number;
  maxStaffAccounts: number;
  aiOwnerAssistant: { perDay: number; perMonth: number };
  aiCustomerService: { perDay: number; perMonth: number };
}

export const TIER_LIMITS: Record<StoreTier, TierLimits> = {
  starter: {
    maxOutlets: 3,
    maxStaffAccounts: 5,
    aiOwnerAssistant: { perDay: 10, perMonth: 300 },
    aiCustomerService: { perDay: 33, perMonth: 1000 },
  },
  business: {
    maxOutlets: 8,
    maxStaffAccounts: 9,
    aiOwnerAssistant: { perDay: 20, perMonth: 600 },
    aiCustomerService: { perDay: 60, perMonth: 1800 },
  },
  enterprise: {
    maxOutlets: 20,
    maxStaffAccounts: 30,
    aiOwnerAssistant: { perDay: 50, perMonth: 1500 },
    aiCustomerService: { perDay: 300, perMonth: 6900 },
  },
};

// ── Order status ─────────────────────────────────────────────────────────────
//
// Lifecycle:
//   pending → confirmed → completed
//                       ↘ cancelled
//   pending → pending_payment → paid → confirmed → completed
//                                               ↘ refunded
//
// DB default (schema.prisma): "pending"
// Legacy values in existing rows: "Not Ready", "Ready", "Success", "Completed"
// Migration note: run a one-time UPDATE to normalize legacy rows (see P8-2).
//
export const OrderStatus = {
  /** Order created, not yet confirmed by operator. DB default. */
  PENDING: "pending",
  /** Awaiting payment from customer. */
  PENDING_PAYMENT: "pending_payment",
  /** Payment received, awaiting operator confirmation. */
  PAID: "paid",
  /** Operator confirmed — being prepared. */
  CONFIRMED: "confirmed",
  /** Order fulfilled and closed. */
  COMPLETED: "completed",
  /** Cancelled before fulfilment. */
  CANCELLED: "cancelled",
  /** Refunded after payment. */
  REFUNDED: "refunded",
  /** Partially refunded — some items/amount returned but not all. */
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

/** All valid order status strings — use for validation. */
export const ORDER_STATUS_VALUES = Object.values(
  OrderStatus,
) as OrderStatusValue[];

// ── Register session status ───────────────────────────────────────────────────
export const RegisterSessionStatus = {
  OPEN: "open",
  SUSPENDED: "suspended",
  CLOSED: "closed",
} as const;

export type RegisterSessionStatusValue =
  (typeof RegisterSessionStatus)[keyof typeof RegisterSessionStatus];

export const REGISTER_SESSION_STATUS_VALUES = Object.values(
  RegisterSessionStatus,
) as RegisterSessionStatusValue[];

// ── Cashflow entry type ───────────────────────────────────────────────────────
export const CashflowEntryType = {
  INCOME: "income",
  EXPENSE: "expense",
  REFUND: "refund",
} as const;

export type CashflowEntryTypeValue =
  (typeof CashflowEntryType)[keyof typeof CashflowEntryType];

// ── Stock movement type ───────────────────────────────────────────────────────
export const StockMovementType = {
  SALE: "sale",
  RESTOCK: "restock",
  ADJUSTMENT: "adjustment",
  WASTE: "waste",
  RETURN: "return",
  TRANSFER: "transfer",
} as const;

export type StockMovementTypeValue =
  (typeof StockMovementType)[keyof typeof StockMovementType];

// ── Online Channels (Tablet Stacking & Integrations) ─────────────────────────
export const OnlineChannel = {
  IN_STORE: "in_store",
  GOFOOD: "gofood",
  GRABFOOD: "grabfood",
  SHOPEEFOOD: "shopeefood",
  TOKOPEDIA: "tokopedia",
  TIKTOK: "tiktok",
  DIRECT_COURIER: "direct_courier",
  OTHER: "other",
} as const;

export type OnlineChannelValue =
  (typeof OnlineChannel)[keyof typeof OnlineChannel];

// ── Payment method ────────────────────────────────────────────────────────────
export const PaymentMethod = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  GOPAY: "GoPay",
  GOFOOD: "GoFood",
  GRABFOOD: "GrabFood",
  SHOPEEFOOD: "ShopeeFood",
  COURIER_COD: "Courier COD",
} as const;

export type PaymentMethodValue =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ── Payment status ────────────────────────────────────────────────────────────
export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

export type PaymentStatusValue =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

// POS immutable sale status.
export const PosSaleStatus = {
  PAID: "paid",
  VOIDED: "voided",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type PosSaleStatusValue =
  (typeof PosSaleStatus)[keyof typeof PosSaleStatus];

// Order-level tax mode placeholder for receipt total persistence.
export const PosTaxMode = {
  EXCLUSIVE: "exclusive",
  INCLUSIVE: "inclusive",
} as const;

export type PosTaxModeValue = (typeof PosTaxMode)[keyof typeof PosTaxMode];

// Correction document type.
export const PosCorrectionType = {
  VOID: "void",
  REFUND: "refund",
  RETURN: "return",
} as const;

export type PosCorrectionTypeValue =
  (typeof PosCorrectionType)[keyof typeof PosCorrectionType];

// Manager approval foundation.
export const ManagerApprovalStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export type ManagerApprovalStatusValue =
  (typeof ManagerApprovalStatus)[keyof typeof ManagerApprovalStatus];

// ── Product type ──────────────────────────────────────────────────────────────
//
// Controls how the POS and inventory treat each product:
//   simple   – standard physical item with stock tracking (default for legacy rows)
//   variant  – a child product of a parent; shares parent_product_id
//   service  – labour/service item; no physical stock; is_stock_tracked = false
//   bundle   – a kit of multiple products sold together
//   material – raw ingredient / material (warehouse / toko bangunan use)
//
// DB storage: String column "product_type" in menu table.
// Default: "simple" — applied automatically to all existing rows via migration.
//
export const ProductType = {
  SIMPLE: "simple",
  VARIANT: "variant",
  SERVICE: "service",
  BUNDLE: "bundle",
  MATERIAL: "material",
} as const;

export type ProductTypeValue = (typeof ProductType)[keyof typeof ProductType];

/** All valid product_type strings — use for validation / guards. */
export const PRODUCT_TYPE_VALUES = Object.values(
  ProductType,
) as ProductTypeValue[];

// ── Common unit codes (ISO-like shortcodes) ───────────────────────────────────
// Stored in menu.unit_code. unit_name holds the human-readable label.
// This is a suggestion list; the field is free-text so custom units are allowed.
export const UnitCode = {
  PCS: "pcs", // pieces
  BOX: "box", // box
  KG: "kg", // kilogram
  G: "g", // gram
  L: "l", // litre
  ML: "ml", // millilitre
  M: "m", // metre
  M2: "m2", // square metre (lumber/tiles)
  ROLL: "roll", // roll
  PACK: "pack", // pack
  SET: "set", // set
  SVC: "svc", // service (labour hour, session)
} as const;

export type UnitCodeValue = (typeof UnitCode)[keyof typeof UnitCode];

// ── Inventory location type ───────────────────────────────────────────────────
//
// Describes the physical or logical role of a stock location:
//   warehouse  – main storage area (default for most stores)
//   floor      – sales floor / display area
//   pos        – point-of-sale counter stock
//   transit    – stock in transit between locations
//   damaged    – quarantine / damaged goods area
//   virtual    – non-physical location (e.g. consignment, online)
//
// DB storage: String column "type" in inventory_locations table.
//
export const InventoryLocationType = {
  WAREHOUSE: "warehouse",
  FLOOR: "floor",
  POS: "pos",
  TRANSIT: "transit",
  DAMAGED: "damaged",
  VIRTUAL: "virtual",
} as const;

export type InventoryLocationTypeValue =
  (typeof InventoryLocationType)[keyof typeof InventoryLocationType];

export const INVENTORY_LOCATION_TYPE_VALUES = Object.values(
  InventoryLocationType,
) as InventoryLocationTypeValue[];

// ── Operation document type ───────────────────────────────────────────────────
//
// Controls which stock movements are created when a document is posted:
//   purchase_order  – intent to purchase; no stock movement until received
//   goods_receipt   – receiving goods from supplier; creates RESTOCK movement
//   stock_transfer  – move stock between locations; creates TRANSFER_OUT + TRANSFER_IN
//   stock_adjustment – manual correction; creates ADJUSTMENT movement
//
// DB storage: String column "document_type" in operation_documents table.
//
export const OperationDocumentType = {
  PURCHASE_ORDER: "purchase_order",
  GOODS_RECEIPT: "goods_receipt",
  STOCK_TRANSFER: "stock_transfer",
  STOCK_ADJUSTMENT: "stock_adjustment",
} as const;

export type OperationDocumentTypeValue =
  (typeof OperationDocumentType)[keyof typeof OperationDocumentType];

export const OPERATION_DOCUMENT_TYPE_VALUES = Object.values(
  OperationDocumentType,
) as OperationDocumentTypeValue[];

// ── Operation document status ─────────────────────────────────────────────────
//
// Lifecycle:
//   draft → submitted → posted
//                     ↘ cancelled
//   draft → cancelled
//
// Only "posted" documents affect stock.
// "cancelled" documents are immutable and do not affect stock.
//
export const OperationDocumentStatus = {
  /** Document created, not yet submitted for review. */
  DRAFT: "draft",
  /** Submitted for posting — awaiting confirmation. */
  SUBMITTED: "submitted",
  /** Posted — stock movements have been applied. Immutable. */
  POSTED: "posted",
  /** Cancelled — no stock movements applied. Immutable. */
  CANCELLED: "cancelled",
} as const;

export type OperationDocumentStatusValue =
  (typeof OperationDocumentStatus)[keyof typeof OperationDocumentStatus];

export const OPERATION_DOCUMENT_STATUS_VALUES = Object.values(
  OperationDocumentStatus,
) as OperationDocumentStatusValue[];

// ── Product variant type ──────────────────────────────────────────────────────
//
// Describes the dimension along which a product varies:
//   size     – S / M / L / XL / 1kg / 2kg
//   color    – Red / Blue / Black / White
//   material – Kayu / Besi / Plastik
//   grade    – Grade A / Grade B / Premium
//   custom   – any other dimension
//
// DB storage: String column "variant_type" in product_variants table.
//
export const ProductVariantType = {
  SIZE: "size",
  COLOR: "color",
  MATERIAL: "material",
  GRADE: "grade",
  CUSTOM: "custom",
} as const;

export type ProductVariantTypeValue =
  (typeof ProductVariantType)[keyof typeof ProductVariantType];

export const PRODUCT_VARIANT_TYPE_VALUES = Object.values(
  ProductVariantType,
) as ProductVariantTypeValue[];

// ── Barcode type ──────────────────────────────────────────────────────────────
//
// Describes the barcode format stored in product_barcodes:
//   ean13    – standard retail barcode (13 digits)
//   ean8     – short retail barcode (8 digits)
//   qr       – QR code
//   code128  – alphanumeric barcode (logistics/warehouse)
//   internal – internal/custom barcode
//   custom   – any other format
//
// DB storage: String column "barcode_type" in product_barcodes table.
//
export const BarcodeType = {
  EAN13: "ean13",
  EAN8: "ean8",
  QR: "qr",
  CODE128: "code128",
  INTERNAL: "internal",
  CUSTOM: "custom",
} as const;

export type BarcodeTypeValue = (typeof BarcodeType)[keyof typeof BarcodeType];

export const BARCODE_TYPE_VALUES = Object.values(
  BarcodeType,
) as BarcodeTypeValue[];
