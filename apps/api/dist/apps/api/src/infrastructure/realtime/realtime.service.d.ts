export declare class RealtimeService {
    private readonly logger;
    init(httpServer: any): void;
    emit(eventName: string, payload: Record<string, any>, room?: string): void;
    emitOrderCreated(order: {
        orderId?: number;
        id?: number;
        name?: string;
        type?: string;
        total?: number;
        status?: string;
    }): void;
    emitOrderStatusChanged(orderId: number, oldStatus: string, newStatus: string): void;
    emitStockAlert(product: {
        id: number;
        name: string;
        stock: number;
    }): void;
    emitLowStockBatch(products: Array<{
        id: number;
        name: string;
        stock: number;
    }>): void;
    emitInboxEvent(inboxRow: {
        event_type: string;
        payload: string;
    }): void;
    emitNotification(notification: Record<string, any>): void;
}
