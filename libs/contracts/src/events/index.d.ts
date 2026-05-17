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
export declare function createEvent(eventType: string, aggregateId: string, payload: Record<string, any>, meta?: EventMeta): BaseEvent;
export declare const ORDER_EVENTS: {
    readonly CREATED: "order.created";
    readonly STATUS_CHANGED: "order.status_changed";
    readonly CONFIRMED: "order.confirmed";
    readonly COMPLETED: "order.completed";
    readonly CANCELLED: "order.cancelled";
    readonly REFUNDED: "order.refunded";
};
export declare const PAYMENT_EVENTS: {
    readonly RECORDED: "payment.recorded";
    readonly CONFIRMED: "payment.confirmed";
    readonly FAILED: "payment.failed";
    readonly REFUNDED: "payment.refunded";
};
export declare const POS_SALE_EVENTS: {
    readonly RECEIPT_ISSUED: "pos.sale.receipt_issued";
    readonly VOIDED: "pos.sale.voided";
    readonly REFUNDED: "pos.sale.refunded";
};
export declare const POS_CORRECTION_EVENTS: {
    readonly CREATED: "pos.correction.created";
};
export declare const MANAGER_APPROVAL_EVENTS: {
    readonly REQUESTED: "manager_approval.requested";
    readonly APPROVED: "manager_approval.approved";
    readonly REJECTED: "manager_approval.rejected";
};
export declare const STOCK_EVENTS: {
    readonly RESERVED: "stock.reserved";
    readonly RELEASED: "stock.released";
    readonly ADJUSTED: "stock.adjusted";
    readonly LOW: "stock.low";
    readonly OUT: "stock.out";
};
export declare const CASHFLOW_EVENTS: {
    readonly INCOME_RECORDED: "cashflow.income.recorded";
    readonly EXPENSE_RECORDED: "cashflow.expense.recorded";
    readonly REFUND_RECORDED: "cashflow.refund.recorded";
};
export declare const REGISTER_EVENTS: {
    readonly OPENED: "register.opened";
    readonly SUSPENDED: "register.suspended";
    readonly RESUMED: "register.resumed";
    readonly CLOSED: "register.closed";
};
export declare const CHATBOT_EVENTS: {
    readonly MESSAGE_RECEIVED: "chatbot.message.received";
    readonly REPLY_SENT: "chatbot.reply.sent";
};
export declare const LLM_EVENTS: {
    readonly RESPONSE_GENERATED: "llm.response.generated";
};
export declare const CONFIG_EVENTS: {
    readonly UPDATED: "config.updated";
};
export declare const AUDIT_EVENTS: {
    readonly RECORDED: "audit.recorded";
};
export declare const EVENT_TYPES: {
    readonly RECORDED: "audit.recorded";
    readonly UPDATED: "config.updated";
    readonly RESPONSE_GENERATED: "llm.response.generated";
    readonly MESSAGE_RECEIVED: "chatbot.message.received";
    readonly REPLY_SENT: "chatbot.reply.sent";
    readonly OPENED: "register.opened";
    readonly SUSPENDED: "register.suspended";
    readonly RESUMED: "register.resumed";
    readonly CLOSED: "register.closed";
    readonly INCOME_RECORDED: "cashflow.income.recorded";
    readonly EXPENSE_RECORDED: "cashflow.expense.recorded";
    readonly REFUND_RECORDED: "cashflow.refund.recorded";
    readonly RESERVED: "stock.reserved";
    readonly RELEASED: "stock.released";
    readonly ADJUSTED: "stock.adjusted";
    readonly LOW: "stock.low";
    readonly OUT: "stock.out";
    readonly CONFIRMED: "payment.confirmed";
    readonly FAILED: "payment.failed";
    readonly REFUNDED: "payment.refunded";
    readonly RECEIPT_ISSUED: "pos.sale.receipt_issued";
    readonly VOIDED: "pos.sale.voided";
    readonly REQUESTED: "manager_approval.requested";
    readonly APPROVED: "manager_approval.approved";
    readonly REJECTED: "manager_approval.rejected";
    readonly CREATED: "order.created";
    readonly STATUS_CHANGED: "order.status_changed";
    readonly COMPLETED: "order.completed";
    readonly CANCELLED: "order.cancelled";
};
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
