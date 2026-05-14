export interface OutboxMeta {
    storeId?: string;
    tenantId?: string;
    source?: string;
    correlationId?: string;
    aggregateId?: string;
}
export declare function writeToOutbox(tx: any, eventType: string, payload: Record<string, any>, meta?: OutboxMeta): Promise<void>;
export declare function writeToOutboxBestEffort(prisma: any, eventType: string, payload: Record<string, any>, meta?: OutboxMeta): Promise<void>;
