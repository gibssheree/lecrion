import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit log entry.
   * Fire-and-forget: failure is logged but doesn't throw.
   */
  record(opts: AuditRecordOptions): void {
    const {
      actor, action, resource, resourceId, before, after,
      tenantId = 'default', storeId = 'default-store', correlationId, channel = 'api'
    } = opts;

    // We don't await this to keep it non-blocking for the caller
    this.prisma.audit_logs.create({
      data: {
        actor: String(actor),
        action: String(action),
        resource: String(resource),
        resource_id: resourceId != null ? String(resourceId) : null,
        before_value: before != null ? JSON.stringify(before) : null,
        after_value: after != null ? JSON.stringify(after) : null,
        tenant_id: String(tenantId),
        store_id: String(storeId),
        correlation_id: correlationId ? String(correlationId) : null,
        channel: String(channel),
      },
    }).catch((err) => {
      this.logger.warn(`Audit write failed: ${err.message}`, { actor, action, resource });
    });
  }

  async query(filters: { actor?: string; resource?: string; action?: string; limit?: number } = {}) {
    const { actor, resource, action, limit = 50 } = filters;
    
    return this.prisma.audit_logs.findMany({
      where: {
        actor: actor || undefined,
        resource: resource || undefined,
        action: action || undefined,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }
}
