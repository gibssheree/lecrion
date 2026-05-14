import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { renderMetrics } from '@libs/common/src/telemetry/metrics';

export type HealthStatus = 'ok' | 'degraded' | 'unhealthy';

export interface CheckResult {
  status: 'ok' | 'fail';
  latencyMs: number;
  error?: string;
}

export interface HealthReport {
  status: HealthStatus;
  service: string;
  version: string;
  uptime: number;
  memoryMb: number;
  timestamp: string;
  checks: Record<string, CheckResult>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthReport> {
    const checks: Record<string, CheckResult> = {};
    let status: HealthStatus = 'ok';

    // ── DB check (critical) ──────────────────────────────────────────────────
    const dbStart = Date.now();
    try {
      // Simple query to verify DB connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      checks['db'] = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
      checks['db'] = {
        status: 'fail',
        latencyMs: Date.now() - dbStart,
        error: err.message,
      };
      status = 'unhealthy'; // DB failure = unhealthy
      this.logger.error(`Health check DB failed: ${err.message}`);
    }

    // ── Outbox backlog check (non-critical) ──────────────────────────────────
    const outboxStart = Date.now();
    try {
      const pending = await this.prisma.sync_outbox.count({
        where: { status: 'pending' },
      });
      const dead = await this.prisma.sync_outbox.count({
        where: { status: 'dead' },
      });
      checks['outbox'] = {
        status: dead > 10 ? 'fail' : 'ok',
        latencyMs: Date.now() - outboxStart,
        ...(dead > 0 ? { error: `${dead} dead-letter events` } : {}),
      };
      if (dead > 10 && status === 'ok') status = 'degraded';
      // Attach counts as extra info
      (checks['outbox'] as any).pending = pending;
      (checks['outbox'] as any).dead = dead;
    } catch (err: any) {
      checks['outbox'] = {
        status: 'fail',
        latencyMs: Date.now() - outboxStart,
        error: err.message,
      };
      if (status === 'ok') status = 'degraded';
    }

    // ── Idempotency key cleanup check (non-critical) ─────────────────────────
    const idempStart = Date.now();
    try {
      const expired = await this.prisma.idempotency_keys.count({
        where: { expires_at: { lt: new Date().toISOString() } },
      });
      checks['idempotency'] = {
        status: 'ok',
        latencyMs: Date.now() - idempStart,
      };
      (checks['idempotency'] as any).expiredKeys = expired;
    } catch (err: any) {
      checks['idempotency'] = {
        status: 'fail',
        latencyMs: Date.now() - idempStart,
        error: err.message,
      };
    }

    const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

    return {
      status,
      service: 'api',
      version: process.env['npm_package_version'] ?? '1.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memoryMb: memMb,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Returns Prometheus-format metrics text.
   * Content-Type should be text/plain for real Prometheus scraping.
   */
  metrics(): string {
    return renderMetrics();
  }
}
