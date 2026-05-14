"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOrderCreated = emitOrderCreated;
exports.emitOrderStatusChanged = emitOrderStatusChanged;
exports.emitStockAlert = emitStockAlert;
exports.emitLowStockBatch = emitLowStockBatch;
exports.emitInboxEvent = emitInboxEvent;
exports.emitNotification = emitNotification;
const socket_1 = require("./socket");
function emitOrderCreated(order) {
    (0, socket_1.emit)("order.created", {
        event: "order.created",
        orderId: order.orderId ?? order.id,
        name: order.name,
        type: order.type,
        total: order.total,
        status: order.status ?? "Not Ready",
    });
}
function emitOrderStatusChanged(orderId, oldStatus, newStatus) {
    (0, socket_1.emit)("order.status_changed", {
        event: "order.status_changed",
        orderId,
        oldStatus,
        newStatus,
    });
}
function emitStockAlert(product) {
    (0, socket_1.emit)("stock.alert", {
        event: "stock.alert",
        productId: product.id,
        name: product.name,
        stock: product.stock,
    });
}
function emitLowStockBatch(products) {
    (0, socket_1.emit)("stock.low_stock_batch", {
        event: "stock.low_stock_batch",
        count: products.length,
        products,
    });
}
function emitInboxEvent(inboxRow) {
    try {
        const payload = JSON.parse(inboxRow.payload ?? "{}");
        (0, socket_1.emit)("sync.inbox", { event: inboxRow.event_type, ...payload });
    }
    catch {
    }
}
function emitNotification(notification) {
    (0, socket_1.emit)("notification", notification);
}
//# sourceMappingURL=publishers.js.map