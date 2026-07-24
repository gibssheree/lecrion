import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { ToolCallResult } from './llm.types';

@Injectable()
export class LlmToolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a named tool call from the LLM.
   * All tools are read-only — LLM cannot write to the database.
   */
  async executeTool(
    toolName: string,
    args: Record<string, any> = {},
  ): Promise<ToolCallResult> {
    try {
      switch (toolName) {
        case 'check_product_stock':
          return await this.checkProductStock(args.name);
        case 'get_order_status':
          return await this.getOrderStatus(args.orderId);
        case 'list_open_orders':
          return await this.listOpenOrders(args.limit);
        case 'get_daily_sales_summary':
          return await this.getDailySalesSummary();
        case 'search_customer_history':
          return await this.searchCustomerHistory(args.phone);
        // ── Phase 1: New roadmap tools ───────────────────────────────────────
        case 'get_split_payment_analytics':
          return await this.getSplitPaymentAnalytics(args.period, args.storeId);
        case 'get_hourly_sales_pattern':
          return await this.getHourlySalesPattern(args.storeId, args.date);
        case 'get_aggregator_channel_breakdown':
          return await this.getAggregatorChannelBreakdown(args.storeId, args.date);
        case 'get_offline_sync_status':
          return await this.getOfflineSyncStatus(args.storeId);
        default:
          return { ok: false, error: `Tool "${toolName}" tidak dikenal` };
      }
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private async checkProductStock(name: string): Promise<ToolCallResult> {
    if (!name) return { ok: false, error: 'Parameter name diperlukan' };
    const rows = await this.prisma.menu.findMany({
      where: { name: { contains: name } },
      take: 5,
      select: { id: true, name: true, price: true, stock: true },
    });
    if (!rows.length) {
      return {
        ok: true,
        result: {
          found: false,
          message: `Tidak ada produk dengan nama "${name}"`,
        },
      };
    }
    return {
      ok: true,
      result: {
        found: true,
        products: rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: Number(r.price),
          stock: r.stock,
        })),
      },
    };
  }

  private async getOrderStatus(orderId: number): Promise<ToolCallResult> {
    const id = Number(orderId);
    if (!id) return { ok: false, error: 'Parameter orderId diperlukan' };

    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        payment_method: true,
        created_at: true,
      },
    });
    if (!order) {
      return {
        ok: true,
        result: { found: false, message: `Order #${id} tidak ditemukan` },
      };
    }

    const items = await this.prisma.order_items.findMany({
      where: { order_id: id },
      select: { name: true, price: true, qty: true },
    });
    const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);

    return {
      ok: true,
      result: { found: true, order: { ...order, items, total } },
    };
  }

  private async listOpenOrders(limit = 10): Promise<ToolCallResult> {
    const safeLimit = Math.min(Number(limit) || 10, 50);
    const orders = await this.prisma.orders.findMany({
      where: {
        status: { notIn: ['cancelled', 'completed', 'refunded'] },
      },
      orderBy: { created_at: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        created_at: true,
      },
    });
    return { ok: true, result: { orders, count: orders.length } };
  }

  private async getDailySalesSummary(): Promise<ToolCallResult> {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ order_count: number; revenue: number }>
    >(
      `SELECT COUNT(DISTINCT o.id) AS order_count, COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')`,
      today,
    );

    const topItems = await this.prisma.$queryRawUnsafe<
      Array<{ name: string; units: number; revenue: number }>
    >(
      `SELECT oi.name, SUM(oi.qty) AS units, SUM(oi.price * oi.qty) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')
       GROUP BY oi.name ORDER BY revenue DESC LIMIT 5`,
      today,
    );

    const summary = rows[0] ?? { order_count: 0, revenue: 0 };
    return {
      ok: true,
      result: {
        date: today,
        orderCount: Number(summary.order_count),
        revenue: Number(summary.revenue),
        topItems: topItems.map((i) => ({
          name: i.name,
          units: Number(i.units),
          revenue: Number(i.revenue),
        })),
      },
    };
  }

  private async searchCustomerHistory(phone: string): Promise<ToolCallResult> {
    if (!phone) return { ok: false, error: 'Parameter phone diperlukan' };
    const digits = String(phone).replace(/\D/g, '');

    const orders = await this.prisma.$queryRawUnsafe<
      Array<{
        id: number;
        type: string;
        status: string;
        created_at: string;
        total: number;
      }>
    >(
      `SELECT o.id, o.type, o.status, o.created_at, SUM(oi.price * oi.qty) AS total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.phone = ? OR o.name = ?
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
      digits,
      digits,
    );

    return {
      ok: true,
      result: {
        phone: digits,
        orders: orders.map((o) => ({ ...o, total: Number(o.total) })),
        count: orders.length,
      },
    };
  }

  // ── Phase 1: AI Owner Assistant — New Roadmap Tools ──────────────────────────

  /**
   * get_split_payment_analytics
   * Answers: "Berapa transaksi yang dibayar campur tunai-QRIS minggu ini?"
   *
   * Queries pos_sales.payment_lines (JSON array) to count split vs single-method
   * transactions, and breaks down revenue by payment method combination.
   *
   * @param period  'today' | 'week' | 'month' | undefined (defaults to 'week')
   * @param storeId  store to query (defaults to 'default-store')
   */
  private async getSplitPaymentAnalytics(
    period?: string,
    storeId?: string,
  ): Promise<ToolCallResult> {
    const store = storeId || 'default-store';
    const dateFrom = this.resolvePeriodStart(period || 'week');
    const dateTo = new Date().toISOString();

    // Fetch all paid sales in the period
    const sales = await this.prisma.pos_sales.findMany({
      where: {
        store_id: store,
        status: { in: ['paid', 'partially_refunded'] },
        created_at: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        payment_methods: true, // JSON array of method strings e.g. ["Cash","QRIS"]
        payment_lines: true,   // JSON array with {method, amount, paidAmount}
        total: true,
      },
    });

    let splitCount = 0;
    let singleCount = 0;
    let splitRevenue = 0;
    let singleRevenue = 0;
    const methodComboCounts: Record<string, number> = {};

    for (const sale of sales) {
      let methods: string[] = [];
      try {
        methods = JSON.parse(sale.payment_methods || '[]');
      } catch {
        methods = [];
      }

      const uniqueMethods = [...new Set(methods)];
      const isSplit = uniqueMethods.length > 1;
      const comboKey = uniqueMethods.sort().join(' + ') || 'Unknown';

      if (isSplit) {
        splitCount++;
        splitRevenue += Number(sale.total);
      } else {
        singleCount++;
        singleRevenue += Number(sale.total);
      }

      methodComboCounts[comboKey] = (methodComboCounts[comboKey] || 0) + 1;
    }

    const total = sales.length;
    const topCombos = Object.entries(methodComboCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([combo, count]) => ({
        combo,
        count,
        pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }));

    return {
      ok: true,
      result: {
        period: period || 'week',
        dateFrom: dateFrom.slice(0, 10),
        dateTo: dateTo.slice(0, 10),
        totalTransactions: total,
        splitPayment: {
          count: splitCount,
          revenue: Math.round(splitRevenue),
          pct: total > 0 ? Math.round((splitCount / total) * 1000) / 10 : 0,
        },
        singlePayment: {
          count: singleCount,
          revenue: Math.round(singleRevenue),
          pct: total > 0 ? Math.round((singleCount / total) * 1000) / 10 : 0,
        },
        topPaymentCombinations: topCombos,
      },
    };
  }

  /**
   * get_hourly_sales_pattern
   * Answers: "Jam berapa paling ramai hari ini?" or "Pola penjualan per jam minggu ini"
   *
   * Groups pos_sales by hour-of-day and returns sorted hourly revenue + transaction counts.
   *
   * @param storeId  store to query
   * @param date     ISO date string e.g. '2026-07-24'. Defaults to today.
   */
  private async getHourlySalesPattern(
    storeId?: string,
    date?: string,
  ): Promise<ToolCallResult> {
    const store = storeId || 'default-store';
    const targetDate = (date || new Date().toISOString()).slice(0, 10);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ hour: number; sale_count: number; gross_sales: number }>
    >(
      `SELECT
         CAST(strftime('%H', created_at) AS INTEGER) AS hour,
         COUNT(id) AS sale_count,
         COALESCE(SUM(total), 0) AS gross_sales
       FROM pos_sales
       WHERE store_id = ?
         AND DATE(created_at) = ?
         AND status IN ('paid', 'partially_refunded')
       GROUP BY hour
       ORDER BY hour ASC`,
      store,
      targetDate,
    );

    // Build full 24-hour array, filling zeroes for missing hours
    const hourMap = new Map(rows.map((r) => [Number(r.hour), r]));
    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const row = hourMap.get(h);
      return {
        hour: h,
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        saleCount: row ? Number(row.sale_count) : 0,
        grossSales: row ? Math.round(Number(row.gross_sales)) : 0,
      };
    });

    const peakHour = hourlyData.reduce((prev, curr) =>
      curr.grossSales > prev.grossSales ? curr : prev,
    );

    const totalRevenue = hourlyData.reduce((s, h) => s + h.grossSales, 0);
    const totalTransactions = hourlyData.reduce((s, h) => s + h.saleCount, 0);

    return {
      ok: true,
      result: {
        date: targetDate,
        storeId: store,
        totalRevenue: Math.round(totalRevenue),
        totalTransactions,
        peakHour: {
          hour: peakHour.hour,
          label: peakHour.hourLabel,
          grossSales: peakHour.grossSales,
          saleCount: peakHour.saleCount,
        },
        hourlyData,
      },
    };
  }

  /**
   * get_aggregator_channel_breakdown
   * Answers: "Order dari GoFood vs walk-in mana yang lebih banyak hari ini?"
   *
   * Groups orders by their `type` field (which aggregator orders tag as
   * 'gofood', 'grabfood', 'shopeefood'; walk-in is 'dine_in' or 'pickup').
   *
   * @param storeId  store to query
   * @param date     ISO date string. Defaults to today.
   */
  private async getAggregatorChannelBreakdown(
    storeId?: string,
    date?: string,
  ): Promise<ToolCallResult> {
    const store = storeId || 'default-store';
    const targetDate = (date || new Date().toISOString()).slice(0, 10);

    // Query pos_sales grouped by order_type (channel)
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        channel: string;
        order_count: number;
        gross_sales: number;
        avg_order_value: number;
      }>
    >(
      `SELECT
         order_type AS channel,
         COUNT(id) AS order_count,
         COALESCE(SUM(total), 0) AS gross_sales,
         COALESCE(AVG(total), 0) AS avg_order_value
       FROM pos_sales
       WHERE store_id = ?
         AND DATE(created_at) = ?
         AND status IN ('paid', 'partially_refunded')
       GROUP BY order_type
       ORDER BY gross_sales DESC`,
      store,
      targetDate,
    );

    const totalOrders = rows.reduce((s, r) => s + Number(r.order_count), 0);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.gross_sales), 0);

    const channels = rows.map((r) => ({
      channel: r.channel,
      label: this.channelLabel(r.channel),
      orderCount: Number(r.order_count),
      grossSales: Math.round(Number(r.gross_sales)),
      avgOrderValue: Math.round(Number(r.avg_order_value)),
      pctOfOrders:
        totalOrders > 0
          ? Math.round((Number(r.order_count) / totalOrders) * 1000) / 10
          : 0,
      pctOfRevenue:
        totalRevenue > 0
          ? Math.round((Number(r.gross_sales) / totalRevenue) * 1000) / 10
          : 0,
    }));

    return {
      ok: true,
      result: {
        date: targetDate,
        storeId: store,
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        channels,
        topChannel: channels[0] ?? null,
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Resolve period string to ISO start datetime. */
  private resolvePeriodStart(period: string): string {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();
      case 'month':
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();
      case 'week':
      default: {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return new Date(d.toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();
      }
    }
  }

  /** Map internal order_type to human-readable label. */
  private channelLabel(orderType: string): string {
    const map: Record<string, string> = {
      gofood: 'GoFood',
      grabfood: 'GrabFood',
      shopeefood: 'ShopeeFood',
      dine_in: 'Dine-In (Walk-in)',
      pickup: 'Pickup (Walk-in)',
      delivery: 'Delivery Langsung',
    };
    return map[orderType] ?? orderType;
  }

  // ── Feature 4: Offline / Hybrid — Sync Status Tool ───────────────────────────

  /**
   * get_offline_sync_status
   * Answers: "Ada berapa transaksi offline yang belum tersinkron?"
   *          "Apakah ada error di antrian sinkronisasi?"
   *
   * Reads the sync_outbox table for pending/failed events, and counts
   * any pos_sales rows that may have been created offline (status = 'offline_pending').
   *
   * @param storeId  store to query (defaults to 'default-store')
   */
  private async getOfflineSyncStatus(
    storeId?: string,
  ): Promise<ToolCallResult> {
    const store = storeId || 'default-store';

    // Count pending + failed outbox events for this store
    const outboxRows = await this.prisma.$queryRawUnsafe<
      Array<{ status: string; cnt: number }>
    >(
      `SELECT status, COUNT(id) AS cnt
       FROM sync_outbox
       WHERE status IN ('pending', 'failed', 'processing')
       GROUP BY status`,
    );

    const outboxByStatus: Record<string, number> = {};
    for (const row of outboxRows) {
      outboxByStatus[row.status] = Number(row.cnt);
    }

    const pendingOutbox = outboxByStatus['pending'] ?? 0;
    const failedOutbox = outboxByStatus['failed'] ?? 0;
    const processingOutbox = outboxByStatus['processing'] ?? 0;

    // Look for pos_sales that are still offline_pending (created while device was offline)
    let offlinePendingSales = 0;
    try {
      const result = await this.prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(id) AS cnt FROM pos_sales WHERE status = 'offline_pending' AND store_id = ?`,
        store,
      );
      offlinePendingSales = Number(result[0]?.cnt ?? 0);
    } catch {
      // Table may not have this status — safe to ignore
    }

    const totalPending = pendingOutbox + offlinePendingSales;
    const hasIssues = failedOutbox > 0;

    let statusSummary: string;
    if (totalPending === 0 && !hasIssues) {
      statusSummary = 'Semua data tersinkron. Tidak ada antrian pending.';
    } else if (hasIssues) {
      statusSummary = `⚠️ Ada ${failedOutbox} event gagal di antrian. Perlu perhatian.`;
    } else {
      statusSummary = `${totalPending} transaksi/event sedang menunggu sinkronisasi ke server.`;
    }

    return {
      ok: true,
      result: {
        storeId: store,
        checkedAt: new Date().toISOString(),
        syncOutbox: {
          pending: pendingOutbox,
          processing: processingOutbox,
          failed: failedOutbox,
          total: pendingOutbox + processingOutbox + failedOutbox,
        },
        offlinePendingSales,
        totalPendingItems: totalPending,
        hasFailures: hasIssues,
        statusSummary,
      },
    };
  }
}
