import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export type ProjectionName =
  | 'daily_revenue'
  | 'monthly_revenue'
  | 'top_products'
  | 'payment_mix'
  | 'stock_alerts'
  | 'open_orders'
  | 'bot_conversation_counts'
  | 'hourly_sales'
  | 'cashier_performance';

export interface ProjectionResult {
  data: any;
  builtAt: string;
}

const ALL_PROJECTION_NAMES: ProjectionName[] = [
  'daily_revenue',
  'monthly_revenue',
  'top_products',
  'payment_mix',
  'stock_alerts',
  'open_orders',
  'bot_conversation_counts',
  'hourly_sales',
  'cashier_performance',
];

function normalizeJsonValue(value: any): any {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value))
    return value.map((item) => normalizeJsonValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        normalizeJsonValue(nested),
      ]),
    );
  }
  return value;
}

/**
 * ReadModelService
 *
 * Rebuildable read-model projections for dashboard reporting.
 * Per 04-data-events.md § 8: Dashboards use projections, NOT raw transactional joins.
 */
@Injectable()
export class ReadModelService implements OnModuleInit {
  private readonly logger = new Logger(ReadModelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.rebuildAll().catch((err) => {
      this.logger.warn(`Initial projection rebuild failed: ${err.message}`);
    });
  }

  async rebuild(projectionName?: ProjectionName): Promise<void> {
    const targets = projectionName ? [projectionName] : ALL_PROJECTION_NAMES;
    for (const name of targets) {
      try {
        const data = normalizeJsonValue(await this.buildProjection(name));
        const now = new Date().toISOString();
        await this.prisma.report_snapshots.upsert({
          where: { projection: name },
          update: { payload: JSON.stringify(data), built_at: now },
          create: {
            projection: name,
            payload: JSON.stringify(data),
            built_at: now,
          },
        });
        this.logger.debug(
          `Projection rebuilt: ${name} (${Array.isArray(data) ? data.length : 1} rows)`,
        );
      } catch (err: any) {
        this.logger.warn(`Projection rebuild failed: ${name} — ${err.message}`);
      }
    }
  }

  async rebuildAll(): Promise<void> {
    return this.rebuild();
  }

  async get(projectionName: ProjectionName): Promise<ProjectionResult | null> {
    const row = await this.prisma.report_snapshots.findUnique({
      where: { projection: projectionName },
    });
    if (!row) return null;
    try {
      return { data: JSON.parse(row.payload), builtAt: row.built_at };
    } catch {
      return null;
    }
  }

  async getAll(): Promise<Record<string, ProjectionResult>> {
    const rows = await this.prisma.report_snapshots.findMany();
    const result: Record<string, ProjectionResult> = {};
    for (const row of rows) {
      try {
        result[row.projection] = {
          data: JSON.parse(row.payload),
          builtAt: row.built_at,
        };
      } catch {
        /* skip malformed */
      }
    }
    return result;
  }

  // ─── Projection builders ────────────────────────────────────────────────────

  private async buildProjection(name: ProjectionName): Promise<any> {
    switch (name) {
      case 'daily_revenue':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT DATE(o.created_at) AS date, COUNT(o.id) AS order_count,
                 COALESCE(SUM(order_payments.revenue), 0) AS revenue
          FROM orders o
          JOIN (
            SELECT order_id, SUM(amount) AS revenue
            FROM payments
            WHERE status = 'paid'
            GROUP BY order_id
          ) order_payments ON order_payments.order_id = o.id
          WHERE o.status NOT IN ('cancelled','refunded')
          GROUP BY DATE(o.created_at) ORDER BY date DESC LIMIT 30
        `);

      case 'monthly_revenue':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT strftime('%Y-%m', o.created_at) AS month, COUNT(o.id) AS order_count,
                 COALESCE(SUM(order_payments.revenue), 0) AS revenue
          FROM orders o
          JOIN (
            SELECT order_id, SUM(amount) AS revenue
            FROM payments
            WHERE status = 'paid'
            GROUP BY order_id
          ) order_payments ON order_payments.order_id = o.id
          WHERE o.status NOT IN ('cancelled','refunded')
          GROUP BY strftime('%Y-%m', o.created_at) ORDER BY month DESC LIMIT 12
        `);

      case 'top_products':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT m.id, m.name, SUM(oi.qty) AS units_sold,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
          FROM order_items oi JOIN menu m ON m.id = oi.menu_id
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status NOT IN ('cancelled','refunded')
            AND DATE(o.created_at) >= DATE('now', '-30 days')
          GROUP BY m.id ORDER BY revenue DESC LIMIT 10
        `);

      case 'payment_mix':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT p.payment_method, COUNT(DISTINCT p.order_id) AS order_count,
                 COALESCE(SUM(p.amount), 0) AS revenue
          FROM payments p
          JOIN orders o ON o.id = p.order_id
          WHERE o.status NOT IN ('cancelled','refunded')
            AND p.status = 'paid'
            AND DATE(o.created_at) >= DATE('now', '-30 days')
          GROUP BY p.payment_method
        `);

      case 'stock_alerts':
        return this.prisma.menu.findMany({
          where: { stock: { lte: 5 } },
          orderBy: { stock: 'asc' },
          select: { id: true, name: true, stock: true },
        });

      case 'open_orders':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT o.id, o.name, o.type, o.status, o.created_at,
                 COUNT(oi.id) AS item_count,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS total
          FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status NOT IN ('cancelled','completed','refunded')
          GROUP BY o.id ORDER BY o.created_at ASC
        `);

      case 'bot_conversation_counts':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT DATE(created_at) AS date,
                 COUNT(DISTINCT sender) AS unique_senders,
                 COUNT(*) AS message_count
          FROM chat_history
          WHERE DATE(created_at) >= DATE('now', '-7 days')
          GROUP BY DATE(created_at) ORDER BY date DESC
        `);

      // ── Phase 10: Hourly sales (today) ────────────────────────────────────
      case 'hourly_sales':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT
            CAST(strftime('%H', ps.created_at) AS INTEGER) AS hour,
            COUNT(ps.id) AS sale_count,
            COALESCE(SUM(ps.total), 0) AS gross_sales
          FROM pos_sales ps
          WHERE DATE(ps.created_at) = DATE('now')
            AND ps.status IN ('paid', 'partially_refunded')
          GROUP BY strftime('%H', ps.created_at)
          ORDER BY hour ASC
        `);

      // ── Phase 10: Cashier performance (last 30 days) ──────────────────────
      case 'cashier_performance':
        return this.prisma.$queryRawUnsafe<any[]>(`
          SELECT
            ps.cashier_id,
            COUNT(ps.id) AS sale_count,
            COALESCE(SUM(CASE WHEN ps.status IN ('paid','partially_refunded') THEN ps.total ELSE 0 END), 0) AS gross_sales,
            COALESCE(SUM(CASE WHEN ps.status IN ('paid','partially_refunded') THEN ps.discount_amount ELSE 0 END), 0) AS discount_total,
            COUNT(CASE WHEN ps.status = 'voided' THEN 1 END) AS void_count,
            COALESCE(AVG(CASE WHEN ps.status IN ('paid','partially_refunded') THEN ps.total ELSE NULL END), 0) AS avg_sale_value
          FROM pos_sales ps
          WHERE DATE(ps.created_at) >= DATE('now', '-30 days')
          GROUP BY ps.cashier_id
          ORDER BY gross_sales DESC
        `);

      default:
        throw new Error(`Unknown projection: ${name}`);
    }
  }
}
