"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_TYPES = exports.AUDIT_EVENTS = exports.CONFIG_EVENTS = exports.LLM_EVENTS = exports.CHATBOT_EVENTS = exports.REGISTER_EVENTS = exports.CASHFLOW_EVENTS = exports.STOCK_EVENTS = exports.MANAGER_APPROVAL_EVENTS = exports.POS_CORRECTION_EVENTS = exports.POS_SALE_EVENTS = exports.PAYMENT_EVENTS = exports.ORDER_EVENTS = void 0;
exports.createEvent = createEvent;
function createEvent(eventType, aggregateId, payload, meta = {}) {
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
exports.ORDER_EVENTS = {
    CREATED: "order.created",
    STATUS_CHANGED: "order.status_changed",
    CONFIRMED: "order.confirmed",
    COMPLETED: "order.completed",
    CANCELLED: "order.cancelled",
    REFUNDED: "order.refunded",
};
exports.PAYMENT_EVENTS = {
    RECORDED: "payment.recorded",
    CONFIRMED: "payment.confirmed",
    FAILED: "payment.failed",
    REFUNDED: "payment.refunded",
};
exports.POS_SALE_EVENTS = {
    RECEIPT_ISSUED: "pos.sale.receipt_issued",
    VOIDED: "pos.sale.voided",
    REFUNDED: "pos.sale.refunded",
};
exports.POS_CORRECTION_EVENTS = {
    CREATED: "pos.correction.created",
};
exports.MANAGER_APPROVAL_EVENTS = {
    REQUESTED: "manager_approval.requested",
    APPROVED: "manager_approval.approved",
    REJECTED: "manager_approval.rejected",
};
exports.STOCK_EVENTS = {
    RESERVED: "stock.reserved",
    RELEASED: "stock.released",
    ADJUSTED: "stock.adjusted",
    LOW: "stock.low",
    OUT: "stock.out",
};
exports.CASHFLOW_EVENTS = {
    INCOME_RECORDED: "cashflow.income.recorded",
    EXPENSE_RECORDED: "cashflow.expense.recorded",
    REFUND_RECORDED: "cashflow.refund.recorded",
};
exports.REGISTER_EVENTS = {
    OPENED: "register.opened",
    SUSPENDED: "register.suspended",
    RESUMED: "register.resumed",
    CLOSED: "register.closed",
};
exports.CHATBOT_EVENTS = {
    MESSAGE_RECEIVED: "chatbot.message.received",
    REPLY_SENT: "chatbot.reply.sent",
};
exports.LLM_EVENTS = {
    RESPONSE_GENERATED: "llm.response.generated",
};
exports.CONFIG_EVENTS = {
    UPDATED: "config.updated",
};
exports.AUDIT_EVENTS = {
    RECORDED: "audit.recorded",
};
exports.EVENT_TYPES = {
    ...exports.ORDER_EVENTS,
    ...exports.PAYMENT_EVENTS,
    ...exports.POS_SALE_EVENTS,
    ...exports.POS_CORRECTION_EVENTS,
    ...exports.MANAGER_APPROVAL_EVENTS,
    ...exports.STOCK_EVENTS,
    ...exports.CASHFLOW_EVENTS,
    ...exports.REGISTER_EVENTS,
    ...exports.CHATBOT_EVENTS,
    ...exports.LLM_EVENTS,
    ...exports.CONFIG_EVENTS,
    ...exports.AUDIT_EVENTS,
};
//# sourceMappingURL=index.js.map
