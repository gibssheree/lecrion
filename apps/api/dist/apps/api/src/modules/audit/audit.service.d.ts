import { PrismaService } from '@libs/db/src/prisma';
export interface AuditRecordOptions {
    actor: string;
    action: string;
    resource: string;
    resourceId?: string | number | null;
    before?: any;
    after?: any;
    tenantId?: string;
    storeId?: string;
    correlationId?: string | null;
    channel?: 'api' | 'bot' | 'dashboard' | 'worker';
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    record(opts: AuditRecordOptions): void;
    query(filters?: {
        actor?: string;
        resource?: string;
        action?: string;
        limit?: number;
    }): Promise<{
        created_at: string;
        id: number;
        channel: string;
        actor: string;
        action: string;
        resource: string;
        resource_id: string | null;
        before_value: string | null;
        after_value: string | null;
        tenant_id: string;
        store_id: string;
        correlation_id: string | null;
    }[]>;
}
