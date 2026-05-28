import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

/**
 * SupportService — read/write operations exclusive to platform support.
 *
 * Scope: cross-tenant data (audit logs across stores, system health,
 * platform-level LLM config). Owner-level data (revenue, invoices, etc.)
 * is intentionally NOT exposed here.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Audit logs (cross-store) ────────────────────────────────────────────
  async queryAuditLogs(filters: {
    storeId?: string;
    actor?: string;
    resource?: string;
    action?: string;
    limit?: number;
  }) {
    const { storeId, actor, resource, action, limit = 100 } = filters;
    const cap = Math.min(limit, 500);

    const logs = await this.prisma.audit_logs.findMany({
      where: {
        store_id: storeId || undefined,
        actor: actor || undefined,
        resource: resource || undefined,
        action: action || undefined,
      },
      orderBy: { created_at: 'desc' },
      take: cap,
    });

    return logs.map((l) => ({
      id: l.id,
      actor: l.actor,
      action: l.action,
      resource: l.resource,
      resourceId: l.resource_id,
      tenantId: l.tenant_id,
      storeId: l.store_id,
      channel: l.channel,
      correlationId: l.correlation_id,
      before: this.tryParseJson(l.before_value),
      after: this.tryParseJson(l.after_value),
      createdAt: l.created_at,
    }));
  }

  // ── System health (read-only diagnostics) ───────────────────────────────
  async getSystemHealth(): Promise<{
    db: { ok: boolean; latencyMs: number };
    sync: {
      pendingOutbox: number;
      processedOutbox: number;
      failedOutbox: number;
      lastProcessedAt: string | null;
    };
    activity: {
      sessionsActive: number;
      ordersToday: number;
      stores: number;
      users: number;
    };
    timestamp: string;
  }> {
    const t0 = Date.now();
    let dbOk = false;
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const latencyMs = Date.now() - t0;

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).toISOString();

    const [pending, processed, failed, lastProc, sessions, salesAgg, users] =
      await Promise.all([
        this.tryCount(() =>
          this.prisma.sync_outbox.count({ where: { status: 'pending' } }),
        ),
        this.tryCount(() =>
          this.prisma.sync_outbox.count({ where: { status: 'processed' } }),
        ),
        this.tryCount(() =>
          this.prisma.sync_outbox.count({
            where: { OR: [{ status: 'failed' }, { status: 'dead' }] },
          }),
        ),
        this.tryFirst(() =>
          this.prisma.sync_outbox.findFirst({
            where: { status: 'processed' },
            orderBy: { processed_at: 'desc' },
            select: { processed_at: true },
          }),
        ),
        this.tryCount(() =>
          this.prisma.cash_register_sessions.count({
            where: { status: 'open' },
          }),
        ),
        this.tryFirst<{ count: number; total: number }>(async () => {
          const r = (await this.prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
             FROM pos_sales WHERE created_at >= ?`,
            startOfDay,
          )) as Array<{ count: number; total: number }>;
          return r?.[0] ?? null;
        }),
        this.tryCount(() => this.prisma.users.count()),
      ]);

    const stores = await this.tryFirst<{ c: number }>(async () => {
      const r = (await this.prisma.$queryRawUnsafe(
        `SELECT COUNT(DISTINCT store_id) as c FROM users`,
      )) as Array<{ c: number }>;
      return r?.[0] ?? null;
    });

    return {
      db: { ok: dbOk, latencyMs },
      sync: {
        pendingOutbox: pending,
        processedOutbox: processed,
        failedOutbox: failed,
        lastProcessedAt: lastProc?.processed_at ?? null,
      },
      activity: {
        sessionsActive: sessions,
        ordersToday: Number(salesAgg?.count ?? 0),
        stores: Number(stores?.c ?? 0),
        users: users,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Platform LLM config ─────────────────────────────────────────────────
  // Stored under store_settings with sentinel key 'support:platform' so it
  // doesn't collide with any merchant store_id.
  private readonly LLM_PLATFORM_PREFIX = 'support:platform';

  async getLlmPlatformConfig(): Promise<{
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    systemPrompts: Record<string, string>;
    updatedAt: string | null;
    updatedBy: string | null;
  }> {
    const rows = await this.prisma.store_settings.findMany({
      where: { key: { startsWith: `${this.LLM_PLATFORM_PREFIX}:llm.` } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) {
      const k = r.key.slice(`${this.LLM_PLATFORM_PREFIX}:llm.`.length);
      map[k] = r.value;
    }

    return {
      model: map.model ?? 'gemini-2.0-flash',
      temperature: this.parseNum(map.temperature, 0.7),
      maxTokens: Math.round(this.parseNum(map.maxTokens, 1024)),
      topP: this.parseNum(map.topP, 0.95),
      systemPrompts: this.tryParseJson(map.systemPrompts) ?? {
        customer: '',
        admin: '',
        cashier: '',
        support: '',
      },
      updatedAt: map.updatedAt ?? null,
      updatedBy: map.updatedBy ?? null,
    };
  }

  async setLlmPlatformConfig(
    config: Partial<{
      model: string;
      temperature: number;
      maxTokens: number;
      topP: number;
      systemPrompts: Record<string, string>;
    }>,
    actor: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const entries: Array<[string, string]> = [];
    if (config.model !== undefined) entries.push(['model', config.model]);
    if (config.temperature !== undefined)
      entries.push(['temperature', String(config.temperature)]);
    if (config.maxTokens !== undefined)
      entries.push(['maxTokens', String(config.maxTokens)]);
    if (config.topP !== undefined) entries.push(['topP', String(config.topP)]);
    if (config.systemPrompts !== undefined)
      entries.push(['systemPrompts', JSON.stringify(config.systemPrompts)]);
    entries.push(['updatedAt', now]);
    entries.push(['updatedBy', actor]);

    for (const [k, v] of entries) {
      const dbKey = `${this.LLM_PLATFORM_PREFIX}:llm.${k}`;
      await this.prisma.store_settings.upsert({
        where: { key: dbKey },
        create: { key: dbKey, value: v, updated_at: now },
        update: { value: v, updated_at: now },
      });
    }
    this.logger.log(`LLM platform config updated by ${actor}`);
  }

  // ── Verification queue ──────────────────────────────────────────────────
  async getPendingBusinessProfiles(): Promise<
    Array<{
      storeId: string;
      requestedBusinessVertical: string | null;
      verifiedBusinessVertical: string;
      verificationStatus: string;
      notes: string | null;
      createdAt: string | null;
      updatedAt: string | null;
    }>
  > {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT store_id, requested_business_vertical, verified_business_vertical,
              verification_status, notes, created_at, updated_at
       FROM store_business_profiles
       WHERE verification_status = 'pending'
       ORDER BY updated_at DESC`,
    )) as Array<{
      store_id: string;
      requested_business_vertical: string | null;
      verified_business_vertical: string;
      verification_status: string;
      notes: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>;

    return rows.map((r) => ({
      storeId: r.store_id,
      requestedBusinessVertical: r.requested_business_vertical,
      verifiedBusinessVertical: r.verified_business_vertical,
      verificationStatus: r.verification_status,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  private tryParseJson(raw: string | null | undefined): any {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private parseNum(raw: string | undefined, fallback: number): number {
    if (raw === undefined) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  private async tryCount(fn: () => Promise<number>): Promise<number> {
    try {
      return await fn();
    } catch {
      return 0;
    }
  }

  private async tryFirst<T>(fn: () => Promise<T | null>): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }
}
