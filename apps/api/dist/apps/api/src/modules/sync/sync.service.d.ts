import { PrismaService } from '@libs/db/src/prisma';
export declare class SyncService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    emitOutboxEvent(eventType: string, payload: any): Promise<void>;
    writeOutboxInTx(tx: any, eventType: string, payload: any, meta?: {
        source?: string;
        storeId?: string;
        correlationId?: string;
    }): Promise<void>;
}
