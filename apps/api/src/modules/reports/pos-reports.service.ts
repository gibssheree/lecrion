// apps/api/src/modules/reports/pos-reports.service.ts
//
// Enterprise POS Reporting Service — Agent L
//
// ── Formula definitions ───────────────────────────────────────────────────────
//   gross_sales        = SUM(pos_sales.total) WHERE status = 'paid'
//   refund_total       = SUM(pos_corrections.amount) WHERE type = 'refund'
//   void_amount        = SUM(pos_sales.total) WHERE status = 'voided'
//   net_sales          = gross_sales - refund_total - discount_total
//   discount_total     = SUM(pos_sales.discount_amount) WHERE status = 'paid'
//   tax_total          = SUM(pos_sales.tax_amount) WHERE status IN ('paid','partially_refunded')
//   service_charge_total = SUM(pos_sales.service_charge_amount) WHERE status IN ('paid','partially_refunded')
//
// ── Source tables ─────────────────────────────────────────────────────────────
//   gross_sales        → pos_sales
//   net_sales          → pos_sales + pos_corrections
//   discount_total     → pos_sales
//   tax_total          → pos_sales
//   service_charge_total → pos_sales
//   refund_total       → pos_corrections (type='refund')
//   void_count/amount  → pos_corrections (type='void') + pos_sales (status='voided')
//   correction_summary → pos_corrections
//   payment_mix        → pos_sales.payment_lines (JSON) + cashflow_entries
//   shift_reconciliation → cash_register_sessions + cashflow_entries + pos_sales + pos_corrections
//   top_products       → pos_sale_items

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

function n(v: any): number {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeLimit(limit: number | undefined, def = 30): number {
  const l = Number(limit);
  return Number.isInteger(l) && l > 0 ? l : def;
}

/** Parse a JSON string that should be an array; returns [] on failure. */
function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// Statuses that count as "active" (revenue-generating) sales
const ACTIVE_STATUSES = `'paid','partially_refunded'`;
// Statuses that are fully excluded from gross sales
const VOIDED_STATUS = `'voided'`;

@Injectable()
export class PosReportsService {
  private readonly logger = new Logger(PosReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. POS Summary ────────────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/summary
   *
   * Returns enterprise-grade POS summary metrics for a date range.
   * Defaults to today if no range is provided.
   *
   * Formulas:
   *   gross_sales = SUM(total) WHERE status IN ('paid','partially_refunded')
   *   discount_total = SUM(discount_amount) WHERE status IN ('paid','partially_refunded')
   *   tax_total = SUM(tax_amount) WHERE status IN ('paid','partially_refunded')
   *   service_charge_total = SUM(service_charge_amount) WHERE status IN ('paid','partially_refunded')
   *   refund_total = SUM(pos_corrections.amount) WHERE type = 'refund'
   *   net_sales = gross_sales - discount_total - refund_total
   *   void_count = COUNT(pos_corrections) WHERE type = 'void'
   *   void_amount = SUM(pos_sales.total) WHERE status = 'voided'
   */
  async getPosSummary(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { storeId, dateFrom, dateTo } = params;
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    // ── Sales totals from pos_sales ──────────────────────────────────────────
    const salesRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(ps.id) AS sale_count,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.discount_amount ELSE 0 END), 0) AS discount_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.tax_amount ELSE 0 END), 0) AS tax_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.service_charge_amount ELSE 0 END), 0) AS service_charge_total,
        COALESCE(SUM(CASE WHEN ps.status = ${VOIDED_STATUS} THEN ps.total ELSE 0 END), 0) AS void_amount,
        COUNT(CASE WHEN ps.status = ${VOIDED_STATUS} THEN 1 END) AS void_count_from_status
      FROM pos_sales ps
      WHERE 1=1 ${dateFilter} ${storeFilter}
    `);

    // ── Correction totals from pos_corrections ───────────────────────────────
    const correctionDateFilter = this.buildDateFilter(
      'pc.created_at',
      dateFrom,
      dateTo,
    );
    const correctionStoreFilter = storeId
      ? `AND ps2.store_id = '${storeId}'`
      : '';

    const correctionRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(CASE WHEN pc.type = 'refund' THEN pc.amount ELSE 0 END), 0) AS refund_total,
        COUNT(CASE WHEN pc.type = 'refund' THEN 1 END) AS refund_count,
        COALESCE(SUM(CASE WHEN pc.type = 'void' THEN pc.amount ELSE 0 END), 0) AS void_correction_amount,
        COUNT(CASE WHEN pc.type = 'void' THEN 1 END) AS void_count,
        COALESCE(SUM(CASE WHEN pc.type = 'return' THEN pc.amount ELSE 0 END), 0) AS return_total,
        COUNT(CASE WHEN pc.type = 'return' THEN 1 END) AS return_count
      FROM pos_corrections pc
      LEFT JOIN pos_sales ps2 ON ps2.id = pc.sale_id
      WHERE 1=1 ${correctionDateFilter} ${correctionStoreFilter}
    `);

    const s = salesRows[0] ?? {};
    const c = correctionRows[0] ?? {};

    const grossSales = n(s.gross_sales);
    const discountTotal = n(s.discount_total);
    const refundTotal = n(c.refund_total);
    const netSales = grossSales - discountTotal - refundTotal;

    return {
      saleCount: n(s.sale_count),
      grossSales,
      discountTotal,
      taxTotal: n(s.tax_total),
      serviceChargeTotal: n(s.service_charge_total),
      refundTotal,
      refundCount: n(c.refund_count),
      voidAmount: n(s.void_amount),
      voidCount: n(c.void_count),
      returnTotal: n(c.return_total),
      returnCount: n(c.return_count),
      netSales,
      // Derived: net revenue including tax and service charge
      netRevenue: netSales + n(s.tax_total) + n(s.service_charge_total),
    };
  }

  // ─── 2. POS Daily ──────────────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/daily
   *
   * Daily breakdown of POS metrics for the last N days.
   * Source: pos_sales + pos_corrections
   */
  async getPosDaily(params: { storeId?: string; limit?: number }) {
    const { storeId, limit } = params;
    const safeL = safeLimit(limit, 30);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        DATE(ps.created_at) AS sales_date,
        COUNT(ps.id) AS sale_count,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.discount_amount ELSE 0 END), 0) AS discount_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.tax_amount ELSE 0 END), 0) AS tax_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.service_charge_amount ELSE 0 END), 0) AS service_charge_total,
        COUNT(CASE WHEN ps.status = ${VOIDED_STATUS} THEN 1 END) AS void_count
      FROM pos_sales ps
      WHERE 1=1 ${storeFilter}
      GROUP BY DATE(ps.created_at)
      ORDER BY sales_date DESC
      LIMIT ?
    `,
      safeL,
    );

    // Fetch refunds per day in a separate query (corrections join is expensive inline)
    const refundRows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        DATE(pc.created_at) AS correction_date,
        COALESCE(SUM(CASE WHEN pc.type = 'refund' THEN pc.amount ELSE 0 END), 0) AS refund_total
      FROM pos_corrections pc
      GROUP BY DATE(pc.created_at)
    `,
    );

    const refundByDate = new Map<string, number>();
    for (const r of refundRows) {
      refundByDate.set(r.correction_date, n(r.refund_total));
    }

    return rows.map((r) => {
      const grossSales = n(r.gross_sales);
      const discountTotal = n(r.discount_total);
      const refundTotal = refundByDate.get(r.sales_date) ?? 0;
      return {
        salesDate: r.sales_date,
        saleCount: n(r.sale_count),
        grossSales,
        discountTotal,
        taxTotal: n(r.tax_total),
        serviceChargeTotal: n(r.service_charge_total),
        refundTotal,
        voidCount: n(r.void_count),
        netSales: grossSales - discountTotal - refundTotal,
      };
    });
  }

  // ─── 3. Payment Mix ────────────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/payment-mix
   *
   * Payment method breakdown from pos_sales.payment_lines (JSON snapshot).
   * Handles split payments correctly — each line is counted separately.
   * Source: pos_sales.payment_lines (JSON array per sale)
   */
  async getPosPaymentMix(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { storeId, dateFrom, dateTo } = params;
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    // Fetch all active sales with their payment_lines JSON
    const salesRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT ps.id, ps.payment_lines, ps.total, ps.status
      FROM pos_sales ps
      WHERE ps.status IN (${ACTIVE_STATUSES})
        ${dateFilter} ${storeFilter}
    `);

    // Aggregate payment mix from JSON payment_lines
    const mixMap = new Map<
      string,
      { method: string; saleCount: number; totalAmount: number }
    >();

    for (const sale of salesRows) {
      const lines = parseJsonArray<{
        method: string;
        amount: number;
        paidAmount?: number;
      }>(sale.payment_lines);

      if (lines.length === 0) {
        // Fallback: use payment_methods array
        const methods = parseJsonArray<string>(sale.payment_methods);
        const method = methods[0] ?? 'Unknown';
        const entry = mixMap.get(method) ?? {
          method,
          saleCount: 0,
          totalAmount: 0,
        };
        entry.saleCount += 1;
        entry.totalAmount += n(sale.total);
        mixMap.set(method, entry);
        continue;
      }

      // For split payments: each line is a separate payment method entry
      const methodsInSale = new Set<string>();
      for (const line of lines) {
        const method = line.method ?? 'Unknown';
        const entry = mixMap.get(method) ?? {
          method,
          saleCount: 0,
          totalAmount: 0,
        };
        entry.totalAmount += n(line.amount);
        // Count sale once per method per sale
        if (!methodsInSale.has(method)) {
          entry.saleCount += 1;
          methodsInSale.add(method);
        }
        mixMap.set(method, entry);
      }
    }

    const total = Array.from(mixMap.values()).reduce(
      (sum, e) => sum + e.totalAmount,
      0,
    );

    return Array.from(mixMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((e) => ({
        method: e.method,
        saleCount: e.saleCount,
        totalAmount: e.totalAmount,
        percentage:
          total > 0 ? Math.round((e.totalAmount / total) * 10000) / 100 : 0,
      }));
  }

  // ─── 4. Corrections Report ─────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/corrections
   *
   * Correction summary by type (void/refund/return) with individual records.
   * Source: pos_corrections + pos_sales
   */
  async getPosCorrections(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const { storeId, dateFrom, dateTo, limit } = params;
    const safeL = safeLimit(limit, 50);
    const dateFilter = this.buildDateFilter('pc.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    // Summary by type
    const summaryRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        pc.type,
        COUNT(pc.id) AS count,
        COALESCE(SUM(pc.amount), 0) AS total_amount
      FROM pos_corrections pc
      LEFT JOIN pos_sales ps ON ps.id = pc.sale_id
      WHERE 1=1 ${dateFilter} ${storeFilter}
      GROUP BY pc.type
      ORDER BY pc.type
    `);

    // Individual correction records
    const recordRows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        pc.id,
        pc.correction_number,
        pc.type,
        pc.reason,
        pc.operator_id,
        pc.amount,
        pc.created_at,
        ps.receipt_number,
        ps.cashier_id,
        ps.total AS original_total,
        ps.store_id
      FROM pos_corrections pc
      LEFT JOIN pos_sales ps ON ps.id = pc.sale_id
      WHERE 1=1 ${dateFilter} ${storeFilter}
      ORDER BY pc.created_at DESC
      LIMIT ?
    `,
      safeL,
    );

    const summary = summaryRows.map((r) => ({
      type: r.type,
      count: n(r.count),
      totalAmount: n(r.total_amount),
    }));

    const records = recordRows.map((r) => ({
      id: n(r.id),
      correctionNumber: r.correction_number,
      type: r.type,
      reason: r.reason,
      operatorId: r.operator_id,
      amount: n(r.amount),
      createdAt: r.created_at,
      receiptNumber: r.receipt_number ?? null,
      cashierId: r.cashier_id ?? null,
      originalTotal: n(r.original_total),
      storeId: r.store_id ?? null,
    }));

    return { summary, records };
  }

  // ─── 5. Shift Reconciliation ───────────────────────────────────────────────

  /**
   * GET /api/reports/pos/shift/:sessionId
   *
   * Full shift reconciliation for a register session.
   *
   * Reconciliation formula:
   *   expected_cash = opening_cash + cash_sales - cash_refunds - cash_expenses
   *   variance = counted_cash - expected_cash
   *
   * Source tables:
   *   cash_register_sessions → session metadata, opening/counted/variance
   *   cashflow_entries       → all cash movements (income/expense/refund)
   *   pos_sales              → sales totals for the session
   *   pos_corrections        → refunds/voids for the session
   */
  async getShiftReconciliation(sessionId: number) {
    // Session metadata
    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;

    // Sales totals for this session
    const salesRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(ps.id) AS sale_count,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.discount_amount ELSE 0 END), 0) AS discount_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.tax_amount ELSE 0 END), 0) AS tax_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.service_charge_amount ELSE 0 END), 0) AS service_charge_total,
        COUNT(CASE WHEN ps.status = ${VOIDED_STATUS} THEN 1 END) AS void_count
      FROM pos_sales ps
      WHERE ps.register_session_id = ${sessionId}
    `);

    // Cashflow entries for this session
    const cashflowRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        entry_type,
        payment_method,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*) AS count
      FROM cashflow_entries
      WHERE session_id = ${sessionId}
      GROUP BY entry_type, payment_method
    `);

    // Corrections for this session's sales
    const correctionRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        pc.type,
        COALESCE(SUM(pc.amount), 0) AS total_amount,
        COUNT(pc.id) AS count
      FROM pos_corrections pc
      JOIN pos_sales ps ON ps.id = pc.sale_id
      WHERE ps.register_session_id = ${sessionId}
      GROUP BY pc.type
    `);

    const s = salesRows[0] ?? {};

    // Aggregate cashflow by type and method
    let cashIncome = 0;
    let cashExpense = 0;
    let cashRefund = 0;
    let nonCashIncome = 0;
    const paymentMethodBreakdown: Record<
      string,
      { income: number; refund: number }
    > = {};

    for (const row of cashflowRows) {
      const method = (row.payment_method ?? 'Cash').toLowerCase();
      const isCash = method === 'cash' || method === 'tunai';
      const amount = n(row.total);
      const entryType = row.entry_type;

      if (!paymentMethodBreakdown[row.payment_method]) {
        paymentMethodBreakdown[row.payment_method] = { income: 0, refund: 0 };
      }

      if (entryType === 'income') {
        if (isCash) cashIncome += amount;
        else nonCashIncome += amount;
        paymentMethodBreakdown[row.payment_method].income += amount;
      } else if (entryType === 'expense') {
        if (isCash) cashExpense += amount;
      } else if (entryType === 'refund') {
        if (isCash) cashRefund += amount;
        paymentMethodBreakdown[row.payment_method].refund += amount;
      }
    }

    // Correction summary
    const correctionSummary: Record<
      string,
      { count: number; totalAmount: number }
    > = {};
    for (const row of correctionRows) {
      correctionSummary[row.type] = {
        count: n(row.count),
        totalAmount: n(row.total_amount),
      };
    }

    const openingCash = n(session.opening_cash);
    const expectedCash = openingCash + cashIncome - cashRefund - cashExpense;
    const countedCash =
      session.counted_cash != null ? n(session.counted_cash) : null;
    const variance = countedCash != null ? countedCash - expectedCash : null;

    const grossSales = n(s.gross_sales);
    const discountTotal = n(s.discount_total);
    const refundTotal = n(correctionSummary['refund']?.totalAmount ?? 0);
    const netSales = grossSales - discountTotal - refundTotal;

    return {
      session: {
        id: session.id,
        storeId: session.store_id,
        cashierId: session.cashier_id,
        status: session.status,
        openedAt: session.opened_at,
        closedAt: session.closed_at ?? null,
      },
      sales: {
        saleCount: n(s.sale_count),
        grossSales,
        discountTotal,
        taxTotal: n(s.tax_total),
        serviceChargeTotal: n(s.service_charge_total),
        voidCount: n(s.void_count),
        refundTotal,
        netSales,
      },
      cashReconciliation: {
        openingCash,
        cashIncome,
        cashRefund,
        cashExpense,
        expectedCash,
        countedCash,
        variance,
        nonCashIncome,
      },
      paymentMethodBreakdown,
      corrections: correctionSummary,
    };
  }

  // ─── 6. Top Products from POS ──────────────────────────────────────────────

  /**
   * Top products from pos_sale_items snapshot.
   * Source: pos_sale_items + pos_sales (for status filter)
   */
  async getPosTopProducts(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const { storeId, dateFrom, dateTo, limit } = params;
    const safeL = safeLimit(limit, 10);
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      SELECT
        psi.product_id,
        psi.name,
        COALESCE(SUM(psi.qty), 0) AS units_sold,
        COALESCE(SUM(psi.line_total), 0) AS revenue
      FROM pos_sale_items psi
      JOIN pos_sales ps ON ps.id = psi.sale_id
      WHERE ps.status IN (${ACTIVE_STATUSES})
        ${dateFilter} ${storeFilter}
      GROUP BY psi.product_id, psi.name
      ORDER BY units_sold DESC, revenue DESC
      LIMIT ?
    `,
      safeL,
    );

    return rows.map((r) => ({
      productId: n(r.product_id),
      name: r.name,
      unitsSold: n(r.units_sold),
      revenue: n(r.revenue),
    }));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private buildDateFilter(
    column: string,
    dateFrom?: string,
    dateTo?: string,
  ): string {
    const parts: string[] = [];
    if (dateFrom) {
      // Sanitize: only allow ISO date strings
      const safe = dateFrom.replace(/[^0-9\-T:Z.]/g, '').slice(0, 25);
      parts.push(`AND DATE(${column}) >= DATE('${safe}')`);
    }
    if (dateTo) {
      const safe = dateTo.replace(/[^0-9\-T:Z.]/g, '').slice(0, 25);
      parts.push(`AND DATE(${column}) <= DATE('${safe}')`);
    }
    return parts.join(' ');
  }

  // ─── 7. Hourly Sales ───────────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/hourly
   *
   * Hourly sales breakdown for a specific date (default: today).
   * Useful for identifying peak hours.
   */
  async getPosHourly(params: { storeId?: string; date?: string }) {
    const { storeId, date } = params;
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        CAST(strftime('%H', ps.created_at) AS INTEGER) AS hour,
        COUNT(ps.id) AS sale_count,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.discount_amount ELSE 0 END), 0) AS discount_total
      FROM pos_sales ps
      WHERE DATE(ps.created_at) = '${targetDate.replace(/[^0-9\-]/g, '').slice(0, 10)}'
        ${storeFilter}
      GROUP BY strftime('%H', ps.created_at)
      ORDER BY hour ASC
    `);

    // Fill in missing hours with zeros for a complete 0-23 chart
    const byHour = new Map<number, any>();
    for (const r of rows) byHour.set(n(r.hour), r);

    return Array.from({ length: 24 }, (_, h) => {
      const r = byHour.get(h);
      return {
        hour: h,
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        saleCount: r ? n(r.sale_count) : 0,
        grossSales: r ? n(r.gross_sales) : 0,
        discountTotal: r ? n(r.discount_total) : 0,
      };
    });
  }

  // ─── 8. Cashier Performance ────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/cashier-performance
   *
   * Per-cashier sales performance for a date range.
   * Includes: sale count, gross sales, discount total, void count, avg sale value.
   */
  async getCashierPerformance(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { storeId, dateFrom, dateTo } = params;
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        ps.cashier_id,
        COUNT(ps.id) AS sale_count,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE 0 END), 0) AS gross_sales,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.discount_amount ELSE 0 END), 0) AS discount_total,
        COALESCE(SUM(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.tax_amount ELSE 0 END), 0) AS tax_total,
        COUNT(CASE WHEN ps.status = 'voided' THEN 1 END) AS void_count,
        COALESCE(AVG(CASE WHEN ps.status IN (${ACTIVE_STATUSES}) THEN ps.total ELSE NULL END), 0) AS avg_sale_value,
        MIN(ps.created_at) AS first_sale_at,
        MAX(ps.created_at) AS last_sale_at
      FROM pos_sales ps
      WHERE 1=1 ${dateFilter} ${storeFilter}
      GROUP BY ps.cashier_id
      ORDER BY gross_sales DESC
    `);

    return rows.map((r) => ({
      cashierId: r.cashier_id,
      saleCount: n(r.sale_count),
      grossSales: n(r.gross_sales),
      discountTotal: n(r.discount_total),
      taxTotal: n(r.tax_total),
      voidCount: n(r.void_count),
      avgSaleValue: n(r.avg_sale_value),
      firstSaleAt: r.first_sale_at ?? null,
      lastSaleAt: r.last_sale_at ?? null,
    }));
  }

  // ─── 9. Promo Performance ──────────────────────────────────────────────────

  /**
   * GET /api/reports/pos/promo-performance
   *
   * Promotion and voucher usage performance.
   * Source: pos_sales.promotion_id + promotions table
   */
  async getPromoPerformance(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { storeId, dateFrom, dateTo } = params;
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(p.name, 'Manual Discount') AS promo_name,
        ps.voucher_code,
        COUNT(ps.id) AS usage_count,
        COALESCE(SUM(ps.discount_amount), 0) AS total_discount,
        COALESCE(SUM(ps.total), 0) AS total_sales_with_promo
      FROM pos_sales ps
      LEFT JOIN promotions p ON p.id = ps.promotion_id
      WHERE ps.discount_amount > 0
        AND ps.status IN (${ACTIVE_STATUSES})
        ${dateFilter} ${storeFilter}
      GROUP BY ps.promotion_id, ps.voucher_code
      ORDER BY total_discount DESC
    `);

    return rows.map((r) => ({
      promoName: r.promo_name,
      voucherCode: r.voucher_code ?? null,
      usageCount: n(r.usage_count),
      totalDiscount: n(r.total_discount),
      totalSalesWithPromo: n(r.total_sales_with_promo),
    }));
  }

  // ─── 10. Customer Repeat Rate ──────────────────────────────────────────────

  /**
   * GET /api/reports/pos/customer-repeat
   *
   * Customer repeat purchase rate.
   * Source: pos_sales.customer_id + customers table
   */
  async getCustomerRepeatRate(params: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { storeId, dateFrom, dateTo } = params;
    const dateFilter = this.buildDateFilter('ps.created_at', dateFrom, dateTo);
    const storeFilter = storeId ? `AND ps.store_id = '${storeId}'` : '';

    // Customers with multiple purchases
    const repeatRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COUNT(DISTINCT ps.customer_id) AS customers_with_purchase,
        COUNT(DISTINCT CASE WHEN purchase_counts.cnt > 1 THEN ps.customer_id END) AS repeat_customers
      FROM pos_sales ps
      JOIN (
        SELECT customer_id, COUNT(*) AS cnt
        FROM pos_sales
        WHERE customer_id IS NOT NULL
          AND status IN (${ACTIVE_STATUSES})
          ${dateFilter} ${storeFilter}
        GROUP BY customer_id
      ) purchase_counts ON purchase_counts.customer_id = ps.customer_id
      WHERE ps.customer_id IS NOT NULL
        AND ps.status IN (${ACTIVE_STATUSES})
        ${dateFilter} ${storeFilter}
    `);

    // Top repeat customers
    const topRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.tier,
        COUNT(ps.id) AS purchase_count,
        COALESCE(SUM(ps.total), 0) AS total_spent,
        MAX(ps.created_at) AS last_purchase_at
      FROM pos_sales ps
      JOIN customers c ON c.id = ps.customer_id
      WHERE ps.customer_id IS NOT NULL
        AND ps.status IN (${ACTIVE_STATUSES})
        ${dateFilter} ${storeFilter}
      GROUP BY ps.customer_id
      ORDER BY purchase_count DESC, total_spent DESC
      LIMIT 20
    `);

    const r = repeatRows[0] ?? {};
    const customersWithPurchase = n(r.customers_with_purchase);
    const repeatCustomers = n(r.repeat_customers);
    const repeatRate =
      customersWithPurchase > 0
        ? Math.round((repeatCustomers / customersWithPurchase) * 10000) / 100
        : 0;

    return {
      customersWithPurchase,
      repeatCustomers,
      repeatRate,
      topCustomers: topRows.map((row) => ({
        customerName: row.customer_name,
        customerPhone: row.customer_phone ?? null,
        tier: row.tier ?? 'regular',
        purchaseCount: n(row.purchase_count),
        totalSpent: n(row.total_spent),
        lastPurchaseAt: row.last_purchase_at ?? null,
      })),
    };
  }

  // ─── 11. WhatsApp Summary Formatter ───────────────────────────────────────

  /**
   * Format a daily close summary for WhatsApp.
   * Called by the scheduled bot report.
   */
  async formatDailyCloseSummary(storeId?: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    const [summary, topProducts, paymentMix] = await Promise.all([
      this.getPosSummary({ storeId, dateFrom: today, dateTo: today }),
      this.getPosTopProducts({
        storeId,
        dateFrom: today,
        dateTo: today,
        limit: 5,
      }),
      this.getPosPaymentMix({ storeId, dateFrom: today, dateTo: today }),
    ]);

    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID').format(Math.round(n));
    const lines: string[] = [
      `📊 *Laporan Harian — ${today}*`,
      '',
      `💰 Gross Sales: Rp${fmt(summary.grossSales)}`,
      `✅ Net Sales: Rp${fmt(summary.netSales)}`,
      `🏷️ Diskon: Rp${fmt(summary.discountTotal)}`,
      `🧾 Pajak: Rp${fmt(summary.taxTotal)}`,
      `↩️ Refund: Rp${fmt(summary.refundTotal)} (${summary.refundCount} transaksi)`,
      `❌ Void: ${summary.voidCount} transaksi`,
      `📦 Total Transaksi: ${summary.saleCount}`,
      '',
    ];

    if (paymentMix.length > 0) {
      lines.push('💳 *Metode Pembayaran:*');
      for (const p of paymentMix) {
        lines.push(
          `  • ${p.method}: Rp${fmt(p.totalAmount)} (${p.percentage}%)`,
        );
      }
      lines.push('');
    }

    if (topProducts.length > 0) {
      lines.push('🏆 *Produk Terlaris:*');
      topProducts.slice(0, 5).forEach((p, i) => {
        lines.push(
          `  ${i + 1}. ${p.name} — ${p.unitsSold} unit · Rp${fmt(p.revenue)}`,
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * Format a low stock alert for WhatsApp.
   */
  async formatLowStockAlert(storeId?: string): Promise<string> {
    const lowStock = await this.prisma.menu.findMany({
      where: { stock: { lte: 5, gte: 0 }, is_active: true },
      orderBy: { stock: 'asc' },
      take: 20,
    });

    if (lowStock.length === 0) return '✅ Semua stok aman.';

    const lines = ['⚠️ *Peringatan Stok Menipis:*', ''];
    for (const p of lowStock) {
      const icon = p.stock <= 0 ? '🔴' : '🟡';
      lines.push(
        `${icon} ${p.name}: ${p.stock <= 0 ? 'HABIS' : `sisa ${p.stock}`}`,
      );
    }
    return lines.join('\n');
  }
}
