import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getAuditLogs(actor?: string, resource?: string, action?: string, limit?: string): Promise<{
        logs: {
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
        }[];
    }>;
}
