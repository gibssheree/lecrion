export declare function emitOrderCreated(order: {
    orderId?: number;
    id?: number;
    name?: string;
    type?: string;
    total?: number;
    status?: string;
}): void;
export declare function emitOrderStatusChanged(orderId: number, oldStatus: string, newStatus: string): void;
export declare function emitStockAlert(product: {
    id: number;
    name: string;
    stock: number;
}): void;
export declare function emitLowStockBatch(products: Array<{
    id: number;
    name: string;
    stock: number;
}>): void;
export declare function emitInboxEvent(inboxRow: {
    event_type: string;
    payload: string;
}): void;
export declare function emitNotification(notification: Record<string, any>): void;
