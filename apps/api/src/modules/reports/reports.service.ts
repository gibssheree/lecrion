import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { OrderStatus, PaymentStatus } from '@libs/contracts/src/enums';

function toNumber(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Canonical "revenue-counting" statuses.
 * Orders in these states are considered fulfilled for reporting purposes.
 * Used in raw SQL IN clauses — must stay in sync with OrderStatus enum.
 */
const REVENUE_STATUSES = [
  OrderStatus.COMPLETED,
  OrderStatus.PAID,
  OrderStatus.CONFIRMED,
] as const;

// Pre-built SQL fragment for use in $queryRawUnsafe (no array binding support)
const REVENUE_STATUS_SQL = REVENUE_STATUSES.map((s) => `'${s}'`).join(',');
const PAID_PAYMENT_SQL = `'${PaymentStatus.PAID}'`;

// Statuses that should be excluded from open-order projections
const CLOSED_STATUS_SQL = [
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.REFUNDED,
]
  .map((s) => `'${s}'`)
  .join(',');

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSalesSummary() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      WITH revenue_orders AS (
        SELECT DISTINCT o.id
        FROM orders o
        JOIN payments p ON p.order_id = o.id
        WHERE o.status IN (${REVENUE_STATUS_SQL})
          AND p.status = ${PAID_PAYMENT_SQL}
      ),
      payment_totals AS (
        SELECT p.order_id, SUM(p.amount) AS total_revenue
        FROM payments p
        JOIN revenue_orders ro ON ro.id = p.order_id
        WHERE p.status = ${PAID_PAYMENT_SQL}
        GROUP BY p.order_id
      ),
      item_totals AS (
        SELECT oi.order_id, SUM(oi.qty) AS total_items
        FROM order_items oi
        JOIN revenue_orders ro ON ro.id = oi.order_id
        GROUP BY oi.order_id
      )
      SELECT
        COUNT(ro.id) AS total_orders,
        COALESCE(SUM(it.total_items), 0) AS total_items,
        COALESCE(SUM(pt.total_revenue), 0) AS total_revenue,
        COALESCE(SUM(pt.total_revenue) / NULLIF(COUNT(ro.id), 0), 0) AS avg_order_value
      FROM revenue_orders ro
      LEFT JOIN item_totals it ON it.order_id = ro.id
      LEFT JOIN payment_totals pt ON pt.order_id = ro.id
    `);
    const row = rows[0] ?? {};
    return {
      totalOrders: toNumber(row.total_orders),
      totalItems: toNumber(row.total_items),
      totalRevenue: toNumber(row.total_revenue),
      averageOrderValue: toNumber(row.avg_order_value),
    };
  }

  async getSalesByPayment() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        p.payment_method,
        COUNT(DISTINCT p.order_id) AS total_sales,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT DISTINCT p2.order_id
            FROM payments p2
            JOIN orders o2 ON o2.id = p2.order_id
            WHERE p2.payment_method = p.payment_method
              AND p2.status = ${PAID_PAYMENT_SQL}
              AND o2.status IN (${REVENUE_STATUS_SQL})
          )
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
      GROUP BY p.payment_method
      ORDER BY total_sales DESC
    `);
    return rows.map((r) => ({
      paymentMethod: r.payment_method || '-',
      totalSales: toNumber(r.total_sales),
      totalItems: toNumber(r.total_items),
      totalRevenue: toNumber(r.total_revenue),
    }));
  }

  async getSalesByType() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        o.type AS order_type,
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT DISTINCT o2.id
            FROM orders o2
            JOIN payments p2 ON p2.order_id = o2.id
            WHERE o2.type = o.type
              AND o2.status IN (${REVENUE_STATUS_SQL})
              AND p2.status = ${PAID_PAYMENT_SQL}
          )
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
      GROUP BY o.type
      ORDER BY total_sales DESC
    `);
    return rows.map((r) => ({
      orderType: r.order_type || '-',
      totalSales: toNumber(r.total_sales),
      totalItems: toNumber(r.total_items),
      totalRevenue: toNumber(r.total_revenue),
    }));
  }

  async getSalesDaily(limit = 14) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 14;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        strftime('%Y-%m-%d', o.created_at) AS sales_date,
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          JOIN orders o2 ON o2.id = oi.order_id
          JOIN payments p2 ON p2.order_id = o2.id
          WHERE o2.status IN (${REVENUE_STATUS_SQL})
            AND p2.status = ${PAID_PAYMENT_SQL}
            AND strftime('%Y-%m-%d', o2.created_at) = strftime('%Y-%m-%d', o.created_at)
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
      GROUP BY strftime('%Y-%m-%d', o.created_at)
      ORDER BY sales_date DESC
      LIMIT ?`,
      safeLimit,
    );
    return rows.map((r) => ({
      salesDate: r.sales_date,
      totalSales: toNumber(r.total_sales),
      totalItems: toNumber(r.total_items),
      totalRevenue: toNumber(r.total_revenue),
    }));
  }

  async getSalesForDate(dateValue: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT DISTINCT o2.id
            FROM orders o2
            JOIN payments p2 ON p2.order_id = o2.id
            WHERE o2.status IN (${REVENUE_STATUS_SQL})
              AND p2.status = ${PAID_PAYMENT_SQL}
              AND strftime('%Y-%m-%d', o2.created_at) = strftime('%Y-%m-%d', ?)
          )
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
        AND strftime('%Y-%m-%d', o.created_at) = strftime('%Y-%m-%d', ?)`,
      dateValue,
      dateValue,
    );
    const row = rows[0] ?? {};
    return {
      totalOrders: toNumber(row.total_orders),
      totalItems: toNumber(row.total_items),
      totalRevenue: toNumber(row.total_revenue),
    };
  }

  async getSalesForYear(yearValue: number | string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT DISTINCT o2.id
            FROM orders o2
            JOIN payments p2 ON p2.order_id = o2.id
            WHERE o2.status IN (${REVENUE_STATUS_SQL})
              AND p2.status = ${PAID_PAYMENT_SQL}
              AND strftime('%Y', o2.created_at) = ?
          )
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
        AND strftime('%Y', o.created_at) = ?`,
      String(yearValue),
      String(yearValue),
    );
    const row = rows[0] ?? {};
    return {
      totalOrders: toNumber(row.total_orders),
      totalItems: toNumber(row.total_items),
      totalRevenue: toNumber(row.total_revenue),
    };
  }

  async getSalesForMonth(
    yearValue: number | string,
    monthValue: number | string,
  ) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE((
          SELECT SUM(oi.qty)
          FROM order_items oi
          WHERE oi.order_id IN (
            SELECT DISTINCT o2.id
            FROM orders o2
            JOIN payments p2 ON p2.order_id = o2.id
            WHERE o2.status IN (${REVENUE_STATUS_SQL})
              AND p2.status = ${PAID_PAYMENT_SQL}
              AND strftime('%Y', o2.created_at) = ?
              AND strftime('%m', o2.created_at) = ?
          )
        ), 0) AS total_items,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
        AND strftime('%Y', o.created_at) = ?
        AND strftime('%m', o.created_at) = ?`,
      String(yearValue),
      String(monthValue).padStart(2, '0'),
      String(yearValue),
      String(monthValue).padStart(2, '0'),
    );
    const row = rows[0] ?? {};
    return {
      totalOrders: toNumber(row.total_orders),
      totalItems: toNumber(row.total_items),
      totalRevenue: toNumber(row.total_revenue),
    };
  }

  async getSalesMonthlyBreakdown(yearValue: number | string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        CAST(strftime('%m', o.created_at) AS INTEGER) AS month_number,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(p.amount), 0) AS total_revenue
      FROM orders o
      JOIN payments p ON p.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND p.status = ${PAID_PAYMENT_SQL}
        AND strftime('%Y', o.created_at) = ?
      GROUP BY strftime('%m', o.created_at)
      ORDER BY month_number ASC`,
      String(yearValue),
    );
    return rows.map((r) => ({
      monthNumber: toNumber(r.month_number),
      totalOrders: toNumber(r.total_orders),
      totalItems: 0,
      totalRevenue: toNumber(r.total_revenue),
    }));
  }

  async getSalesTopProducts(
    options: { year?: number; month?: number; limit?: number } = {},
  ) {
    const { year, month, limit = 5 } = options;
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
    const conditions: string[] = [`o.status IN (${REVENUE_STATUS_SQL})`];
    const params: any[] = [];

    if (Number.isInteger(year)) {
      conditions.push("strftime('%Y', o.created_at) = ?");
      params.push(String(year));
    }
    if (Number.isInteger(month)) {
      conditions.push("strftime('%m', o.created_at) = ?");
      params.push(String(month).padStart(2, '0'));
    }
    params.push(safeLimit);

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT
        oi.menu_id,
        oi.name,
        COALESCE(SUM(oi.qty), 0) AS total_qty,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY oi.menu_id, oi.name
      ORDER BY total_qty DESC, total_revenue DESC
      LIMIT ?`,
      ...params,
    );

    return rows.map((r) => ({
      menuId: toNumber(r.menu_id),
      name: r.name,
      totalQty: toNumber(r.total_qty),
      totalRevenue: toNumber(r.total_revenue),
    }));
  }

  async getStockChangeLogs(limit = 30) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 30;
    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
          scl.id, scl.menu_id, m.name AS menu_name, scl.admin_id,
          scl.order_id, scl.change_type, scl.qty_before, scl.qty_change, scl.qty_after, scl.note, scl.created_at
        FROM stock_change_logs scl
        LEFT JOIN menu m ON m.id = scl.menu_id
        ORDER BY scl.created_at DESC, scl.id DESC
        LIMIT ?`,
        safeLimit,
      );
      return rows.map((r) => ({
        id: toNumber(r.id),
        menuId: toNumber(r.menu_id),
        menuName: r.menu_name || '-',
        adminId: r.admin_id ? toNumber(r.admin_id) : null,
        orderId: r.order_id ? toNumber(r.order_id) : null,
        changeType: r.change_type,
        qtyBefore: toNumber(r.qty_before),
        qtyChange: toNumber(r.qty_change),
        qtyAfter: toNumber(r.qty_after),
        note: r.note || '',
        createdAt: r.created_at,
      }));
    } catch (err: any) {
      this.logger.warn(`getStockChangeLogs error: ${err.message}`);
      return [];
    }
  }

  async getYearDetailBundle(year: number) {
    const [yearSales, monthlyBreakdown, topProducts] = await Promise.all([
      this.getSalesForYear(year),
      this.getSalesMonthlyBreakdown(year),
      this.getSalesTopProducts({ year, limit: 10 }),
    ]);
    return { yearSales, monthlyBreakdown, topProducts };
  }

  async getMonthDetailBundle(year: number, month: number) {
    const [monthSales, topProducts] = await Promise.all([
      this.getSalesForMonth(year, month),
      this.getSalesTopProducts({ year, month, limit: 8 }),
    ]);
    return { monthSales, topProducts };
  }
}
