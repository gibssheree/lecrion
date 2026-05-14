"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channels = void 0;
exports.channels = {
    ORDER_CREATED: (storeId) => `store:${storeId}:order:created`,
    ORDER_UPDATED: (storeId) => `store:${storeId}:order:updated`,
    ORDER_CANCELLED: (storeId) => `store:${storeId}:order:cancelled`,
    STOCK_UPDATED: (storeId) => `store:${storeId}:stock:updated`,
    STOCK_LOW_ALERT: (storeId) => `store:${storeId}:stock:low`,
    CHAT_MESSAGE: (storeId) => `store:${storeId}:chat:message`,
    CHAT_REPLY: (storeId) => `store:${storeId}:chat:reply`,
    REGISTER_OPENED: (storeId) => `store:${storeId}:register:opened`,
    REGISTER_CLOSED: (storeId) => `store:${storeId}:register:closed`,
    NOTIFICATION: (storeId) => `store:${storeId}:notification`,
};
//# sourceMappingURL=channels.js.map