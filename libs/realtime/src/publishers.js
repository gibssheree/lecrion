"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitOrderCreated = emitOrderCreated;
exports.emitOrderStatusChanged = emitOrderStatusChanged;
exports.emitStockAlert = emitStockAlert;
exports.emitLowStockBatch = emitLowStockBatch;
exports.emitRegisterOpened = emitRegisterOpened;
exports.emitRegisterClosed = emitRegisterClosed;
exports.emitChatMessage = emitChatMessage;
exports.emitInboxEvent = emitInboxEvent;
exports.emitNotification = emitNotification;
const socket_1 = require("./socket");
const events_1 = require("../../../libs/contracts/src/events");
const DEFAULT_STORE = "default-store";
function emitToStore(eventName, payload, storeId = DEFAULT_STORE) {
    const storeRoom = `store:${storeId}`;
    (0, socket_1.emit)(eventName, { ...payload, storeId }, storeRoom);
    (0, socket_1.emit)(eventName, { ...payload, storeId }, "dashboard");
}
function emitOrderCreated(order) {
    emitToStore(events_1.ORDER_EVENTS.CREATED, {
        event: events_1.ORDER_EVENTS.CREATED,
        orderId: order.orderId ?? order.id,
        name: order.name,
        type: order.type,
        total: order.total,
        status: order.status ?? "pending",
    }, order.storeId);
}
function emitOrderStatusChanged(orderId, oldStatus, newStatus, storeId = DEFAULT_STORE) {
    emitToStore(events_1.ORDER_EVENTS.STATUS_CHANGED, {
        event: events_1.ORDER_EVENTS.STATUS_CHANGED,
        orderId,
        oldStatus,
        newStatus,
    }, storeId);
}
function emitStockAlert(product, storeId = DEFAULT_STORE) {
    emitToStore(events_1.STOCK_EVENTS.LOW, {
        event: events_1.STOCK_EVENTS.LOW,
        productId: product.id,
        name: product.name,
        stock: product.stock,
    }, storeId);
}
function emitLowStockBatch(products, storeId = DEFAULT_STORE) {
    emitToStore(events_1.STOCK_EVENTS.LOW, {
        event: events_1.STOCK_EVENTS.LOW,
        count: products.length,
        products,
    }, storeId);
}
function emitRegisterOpened(sessionId, storeId = DEFAULT_STORE) {
    emitToStore(events_1.REGISTER_EVENTS.OPENED, { event: events_1.REGISTER_EVENTS.OPENED, sessionId }, storeId);
}
function emitRegisterClosed(sessionId, storeId = DEFAULT_STORE) {
    emitToStore(events_1.REGISTER_EVENTS.CLOSED, { event: events_1.REGISTER_EVENTS.CLOSED, sessionId }, storeId);
}
function emitChatMessage(message, storeId = DEFAULT_STORE) {
    emitToStore(events_1.CHATBOT_EVENTS.MESSAGE_RECEIVED, { event: events_1.CHATBOT_EVENTS.MESSAGE_RECEIVED, ...message }, storeId);
}
function emitInboxEvent(inboxRow) {
    try {
        const payload = JSON.parse(inboxRow.payload ?? "{}");
        const storeId = inboxRow.storeId ?? payload?.store_id ?? DEFAULT_STORE;
        emitToStore("sync.inbox", { event: inboxRow.event_type, ...payload }, storeId);
    }
    catch {
    }
}
function emitNotification(notification, storeId = DEFAULT_STORE) {
    emitToStore("notification", notification, storeId);
}
//# sourceMappingURL=publishers.js.map