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
  channel?: 'api' | 'bot' | 'dashboard' | 'worker' | 'aggregator';
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

  /**
   * Query a single store's audit trail.
   *
   * `storeId` is REQUIRED, not optional (SEC-12). This previously filtered
   * only on actor/resource/action, so GET /api/audit returned every store's
   * audit rows — including before_value/after_value payloads for price
   * changes, voids and refunds — to any authenticated caller. Cross-store
   * audit access is a support-only capability and already has its own
   * dedicated path: SupportService.queryAuditLogs, behind @Roles('support').
   */
  async query(filters: {
    storeId: string;
    actor?: string;
    resource?: string;
    action?: string;
    limit?: number;
  }) {
    const { storeId, actor, resource, action, limit = 50 } = filters;

    return this.prisma.audit_logs.findMany({
      where: {
        store_id: storeId,
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
