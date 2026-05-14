export declare const channels: {
    readonly ORDER_CREATED: (storeId: string) => string;
    readonly ORDER_UPDATED: (storeId: string) => string;
    readonly ORDER_CANCELLED: (storeId: string) => string;
    readonly STOCK_UPDATED: (storeId: string) => string;
    readonly STOCK_LOW_ALERT: (storeId: string) => string;
    readonly CHAT_MESSAGE: (storeId: string) => string;
    readonly CHAT_REPLY: (storeId: string) => string;
    readonly REGISTER_OPENED: (storeId: string) => string;
    readonly REGISTER_CLOSED: (storeId: string) => string;
    readonly NOTIFICATION: (storeId: string) => string;
};
