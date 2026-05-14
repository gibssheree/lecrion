"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.PaymentMethod = exports.StockMovementType = exports.CashflowEntryType = exports.REGISTER_SESSION_STATUS_VALUES = exports.RegisterSessionStatus = exports.ORDER_STATUS_VALUES = exports.OrderStatus = void 0;
exports.OrderStatus = {
    PENDING: "pending",
    PENDING_PAYMENT: "pending_payment",
    PAID: "paid",
    CONFIRMED: "confirmed",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    REFUNDED: "refunded",
};
exports.ORDER_STATUS_VALUES = Object.values(exports.OrderStatus);
exports.RegisterSessionStatus = {
    OPEN: "open",
    SUSPENDED: "suspended",
    CLOSED: "closed",
};
exports.REGISTER_SESSION_STATUS_VALUES = Object.values(exports.RegisterSessionStatus);
exports.CashflowEntryType = {
    INCOME: "income",
    EXPENSE: "expense",
    REFUND: "refund",
};
exports.StockMovementType = {
    SALE: "sale",
    RESTOCK: "restock",
    ADJUSTMENT: "adjustment",
    WASTE: "waste",
    RETURN: "return",
};
exports.PaymentMethod = {
    CASH: "Cash",
    TRANSFER: "Transfer",
    QRIS: "QRIS",
    GOPAY: "GoPay",
};
exports.PaymentStatus = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
};
//# sourceMappingURL=index.js.map