import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an outbox event OUTSIDE a transaction (fire-and-forget).
   * Use for non-critical side effects after a commit.
   */
  async emitOutboxEvent(eventType: string, payload: any): Promise<void> {
    try {
      await this.prisma.sync_outbox.create({
        data: {
          event_type: eventType,
          payload: JSON.stringify({
            event_type: eventType,
            aggregate_id: String(payload.orderId || payload.id || ''),
            source: 'api',
            version: 1,
            occurred_at: new Date().toISOString(),
            payload,
          }),
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      this.logger.warn(`Outbox write failed: ${err.message}`);
    }
  }

  /**
   * Write an outbox event INSIDE a transaction (atomic with domain writes).
   * Use when the outbox row must roll back if the transaction fails.
   * Per docs_plan/04-data-events.md § Outbox and Inbox Pattern.
   */
  async writeOutboxInTx(
    tx: any,
    eventType: string,
    payload: any,
    meta: { source?: string; storeId?: string; correlationId?: string } = {},
  ): Promise<void> {
    await tx.sync_outbox.create({
      data: {
        event_type: eventType,
        payload: JSON.stringify({
          event_type: eventType,
          aggregate_id: String(payload.orderId || payload.id || ''),
          source: meta.source ?? 'api',
          version: 1,
          occurred_at: new Date().toISOString(),
          payload,
        }),
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
  }
}
