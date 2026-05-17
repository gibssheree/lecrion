// libs/contracts/src/events/index.ts
// Canonical event type strings — per docs_plan/04-data-events.md
// All outbox writes, realtime emits, and worker listeners must use these constants.

export interface BaseEvent {
  event_id: string;
  event_type: string;
  tenant_id: string;
  store_id: string;
  aggregate_id: string;
  correlation_id: string | null;
  causation_id: string | null;
  source: string;
  version: number;
  occurred_at: string;
  payload: Record<string, any>;
}

export interface EventMeta {
  tenantId?: string;
  storeId?: string;
  correlationId?: string;
  causationId?: string;
  source?: string;
}

export function createEvent(
  eventType: string,
  aggregateId: string,
  payload: Record<string, any>,
  meta: EventMeta = {},
): BaseEvent {
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    tenant_id: meta.tenantId ?? "default",
    store_id: meta.storeId ?? "default-store",
    aggregate_id: aggregateId,
    correlation_id: meta.correlationId ?? null,
    causation_id: meta.causationId ?? null,
    source: meta.source ?? "api",
    version: 1,
    occurred_at: new Date().toISOString(),
    payload,
  };
}

// ── Order events ──────────────────────────────────────────────────────────────
// Aggregate: orders / order_id
export const ORDER_EVENTS = {
  CREATED: "order.created",
  STATUS_CHANGED: "order.status_changed",
  CONFIRMED: "order.confirmed",
  COMPLETED: "order.completed",
  CANCELLED: "order.cancelled",
  REFUNDED: "order.refunded",
} as const;

// ── Payment events ────────────────────────────────────────────────────────────
// Aggregate: payments / payment_id
export const PAYMENT_EVENTS = {
  RECORDED: "payment.recorded",
  CONFIRMED: "payment.confirmed",
  FAILED: "payment.failed",
  REFUNDED: "payment.refunded",
} as const;

// POS sale / receipt events
// Aggregate: pos_sales / sale_id
export const POS_SALE_EVENTS = {
  RECEIPT_ISSUED: "pos.sale.receipt_issued",
  VOIDED: "pos.sale.voided",
  REFUNDED: "pos.sale.refunded",
} as const;

// POS correction document events
// Aggregate: pos_corrections / correction_id
export const POS_CORRECTION_EVENTS = {
  CREATED: "pos.correction.created",
} as const;

// Manager approval request events
// Aggregate: manager_approvals / approval_id
export const MANAGER_APPROVAL_EVENTS = {
  REQUESTED: "manager_approval.requested",
  APPROVED: "manager_approval.approved",
  REJECTED: "manager_approval.rejected",
} as const;

// ── Stock events ──────────────────────────────────────────────────────────────
// Aggregate: menu / product_id
export const STOCK_EVENTS = {
  RESERVED: "stock.reserved",
  RELEASED: "stock.released",
  ADJUSTED: "stock.adjusted",
  LOW: "stock.low",
  OUT: "stock.out",
} as const;

// ── Cashflow events ───────────────────────────────────────────────────────────
// Aggregate: cashflow_entries / entry_id
export const CASHFLOW_EVENTS = {
  INCOME_RECORDED: "cashflow.income.recorded",
  EXPENSE_RECORDED: "cashflow.expense.recorded",
  REFUND_RECORDED: "cashflow.refund.recorded",
} as const;

// ── Register session events ───────────────────────────────────────────────────
// Aggregate: cash_register_sessions / session_id
export const REGISTER_EVENTS = {
  OPENED: "register.opened",
  SUSPENDED: "register.suspended",
  RESUMED: "register.resumed",
  CLOSED: "register.closed",
} as const;

// ── Chatbot events ────────────────────────────────────────────────────────────
export const CHATBOT_EVENTS = {
  MESSAGE_RECEIVED: "chatbot.message.received",
  REPLY_SENT: "chatbot.reply.sent",
} as const;

// ── LLM events ────────────────────────────────────────────────────────────────
export const LLM_EVENTS = {
  RESPONSE_GENERATED: "llm.response.generated",
} as const;

// ── Config events ─────────────────────────────────────────────────────────────
export const CONFIG_EVENTS = {
  UPDATED: "config.updated",
} as const;

// ── Audit events ──────────────────────────────────────────────────────────────
export const AUDIT_EVENTS = {
  RECORDED: "audit.recorded",
} as const;

// ── Operation document events ─────────────────────────────────────────────────
// Aggregate: operation_documents / document_id
export const OPERATION_DOCUMENT_EVENTS = {
  CREATED: "operation_document.created",
  SUBMITTED: "operation_document.submitted",
  POSTED: "operation_document.posted",
  CANCELLED: "operation_document.cancelled",
} as const;

// ── F&B vertical events ───────────────────────────────────────────────────────
// Aggregate: kitchen_tickets / ticket_id
export const FNB_EVENTS = {
  TICKET_CREATED: "fnb.ticket.created",
  TICKET_READY: "fnb.ticket.ready",
  TICKET_SERVED: "fnb.ticket.served",
  TABLE_OCCUPIED: "fnb.table.occupied",
  TABLE_AVAILABLE: "fnb.table.available",
} as const;

// ── Customer / loyalty events ─────────────────────────────────────────────────
// Aggregate: customers / customer_id
export const CUSTOMER_EVENTS = {
  CREATED: "customer.created",
  POINTS_EARNED: "customer.points.earned",
  POINTS_REDEEMED: "customer.points.redeemed",
  TIER_UPGRADED: "customer.tier.upgraded",
} as const;

// ── Flat map for backward-compat and quick lookup ─────────────────────────────
export const EVENT_TYPES = {
  ...ORDER_EVENTS,
  ...PAYMENT_EVENTS,
  ...POS_SALE_EVENTS,
  ...POS_CORRECTION_EVENTS,
  ...MANAGER_APPROVAL_EVENTS,
  ...STOCK_EVENTS,
  ...CASHFLOW_EVENTS,
  ...REGISTER_EVENTS,
  ...CHATBOT_EVENTS,
  ...LLM_EVENTS,
  ...CONFIG_EVENTS,
  ...AUDIT_EVENTS,
  ...OPERATION_DOCUMENT_EVENTS,
  ...FNB_EVENTS,
  ...CUSTOMER_EVENTS,
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
