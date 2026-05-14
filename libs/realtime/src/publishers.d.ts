export declare function emitOrderCreated(order: {
    orderId?: number;
    id?: number;
    name?: string;
    type?: string;
    total?: number;
    status?: string;
    storeId?: string;
}): void;
export declare function emitOrderStatusChanged(orderId: number, oldStatus: string, newStatus: string, storeId?: string): void;
export declare function emitStockAlert(product: {
    id: number;
    name: string;
    stock: number;
}, storeId?: string): void;
export declare function emitLowStockBatch(products: Array<{
    id: number;
    name: string;
    stock: number;
}>, storeId?: string): void;
export declare function emitRegisterOpened(sessionId: number, storeId?: string): void;
export declare function emitRegisterClosed(sessionId: number, storeId?: string): void;
export declare function emitChatMessage(message: {
    sender: string;
    text: string;
}, storeId?: string): void;
export declare function emitInboxEvent(inboxRow: {
    event_type: string;
    payload: string;
    storeId?: string;
}): void;
export declare function emitNotification(notification: Record<string, any>, storeId?: string): void;
