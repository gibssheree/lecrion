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
} as const;

export type StockMovementTypeValue =
  (typeof StockMovementType)[keyof typeof StockMovementType];

// ── Payment method ────────────────────────────────────────────────────────────
export const PaymentMethod = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  GOPAY: "GoPay",
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
