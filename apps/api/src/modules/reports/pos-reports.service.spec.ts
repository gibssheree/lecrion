// apps/api/src/modules/reports/pos-reports.service.spec.ts
//
// Unit tests for PosReportsService — Agent L
//
// Test coverage:
//   1. net_sales = gross_sales - discount_total - refund_total
//   2. split payment appears in payment mix correctly
//   3. refund correction reduces net sales
//   4. voided sale is excluded from gross_sales / net_sales
//   5. shift report reconciles cash sales / refunds / cash in/out

import { PosReportsService } from './pos-reports.service';

// ── Minimal PrismaService mock ────────────────────────────────────────────────

function makePrisma(overrides: Partial<Record<string, any>> = {}) {
  return {
    $queryRawUnsafe: jest.fn(),
    cash_register_sessions: {
      findUnique: jest.fn(),
    },
    ...overrides,
  } as any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal pos_sales row for testing */
function makeSale(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    status: 'paid',
    total: 100_000,
    discount_amount: 0,
    tax_amount: 0,
    service_charge_amount: 0,
    payment_lines: '[]',
    payment_methods: '["Cash"]',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PosReportsService', () => {
  let service: PosReportsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PosReportsService(prisma);
  });

  // ── 1. net_sales formula ────────────────────────────────────────────────────

  describe('getPosSummary — net_sales formula', () => {
    it('net_sales = gross_sales - discount_total - refund_total', async () => {
      // gross_sales = 300_000, discount = 30_000, refund = 50_000
      // net_sales = 300_000 - 30_000 - 50_000 = 220_000
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 3,
            gross_sales: 300_000,
            discount_total: 30_000,
            tax_total: 15_000,
            service_charge_total: 5_000,
            void_amount: 0,
            void_count_from_status: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            refund_total: 50_000,
            refund_count: 1,
            void_correction_amount: 0,
            void_count: 0,
            return_total: 0,
            return_count: 0,
          },
        ]);

      const result = await service.getPosSummary({});

      expect(result.grossSales).toBe(300_000);
      expect(result.discountTotal).toBe(30_000);
      expect(result.refundTotal).toBe(50_000);
      expect(result.netSales).toBe(220_000);
    });

    it('net_sales is zero when gross equals discounts + refunds', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 1,
            gross_sales: 100_000,
            discount_total: 60_000,
            tax_total: 0,
            service_charge_total: 0,
            void_amount: 0,
            void_count_from_status: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            refund_total: 40_000,
            refund_count: 1,
            void_correction_amount: 0,
            void_count: 0,
            return_total: 0,
            return_count: 0,
          },
        ]);

      const result = await service.getPosSummary({});
      expect(result.netSales).toBe(0);
    });

    it('tax and service charge are reported separately from net_sales', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 1,
            gross_sales: 110_000,
            discount_total: 0,
            tax_total: 10_000,
            service_charge_total: 5_000,
            void_amount: 0,
            void_count_from_status: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            refund_total: 0,
            refund_count: 0,
            void_correction_amount: 0,
            void_count: 0,
            return_total: 0,
            return_count: 0,
          },
        ]);

      const result = await service.getPosSummary({});
      // net_sales does NOT include tax or service charge
      expect(result.netSales).toBe(110_000);
      expect(result.taxTotal).toBe(10_000);
      expect(result.serviceChargeTotal).toBe(5_000);
      // netRevenue = netSales + tax + service charge
      expect(result.netRevenue).toBe(125_000);
    });
  });

  // ── 2. Split payment in payment mix ────────────────────────────────────────

  describe('getPosPaymentMix — split payments', () => {
    it('split payment sale appears in both methods', async () => {
      // Sale with Cash 60_000 + QRIS 40_000
      const splitSale = makeSale({
        total: 100_000,
        payment_lines: JSON.stringify([
          { method: 'Cash', amount: 60_000, paidAmount: 60_000 },
          { method: 'QRIS', amount: 40_000, paidAmount: 40_000 },
        ]),
      });

      prisma.$queryRawUnsafe.mockResolvedValueOnce([splitSale]);

      const result = await service.getPosPaymentMix({});

      const cash = result.find((r) => r.method === 'Cash');
      const qris = result.find((r) => r.method === 'QRIS');

      expect(cash).toBeDefined();
      expect(qris).toBeDefined();
      expect(cash!.totalAmount).toBe(60_000);
      expect(qris!.totalAmount).toBe(40_000);
      // Each method counted once for this sale
      expect(cash!.saleCount).toBe(1);
      expect(qris!.saleCount).toBe(1);
    });

    it('single-method sale counted once', async () => {
      const sale = makeSale({
        total: 50_000,
        payment_lines: JSON.stringify([
          { method: 'Cash', amount: 50_000, paidAmount: 50_000 },
        ]),
      });

      prisma.$queryRawUnsafe.mockResolvedValueOnce([sale]);

      const result = await service.getPosPaymentMix({});
      expect(result).toHaveLength(1);
      expect(result[0].method).toBe('Cash');
      expect(result[0].saleCount).toBe(1);
      expect(result[0].totalAmount).toBe(50_000);
    });

    it('percentage sums to 100 for two methods', async () => {
      const sale = makeSale({
        total: 100_000,
        payment_lines: JSON.stringify([
          { method: 'Cash', amount: 50_000 },
          { method: 'Transfer', amount: 50_000 },
        ]),
      });

      prisma.$queryRawUnsafe.mockResolvedValueOnce([sale]);

      const result = await service.getPosPaymentMix({});
      const totalPct = result.reduce((s, r) => s + r.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 1);
    });

    it('returns empty array when no sales', async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);
      const result = await service.getPosPaymentMix({});
      expect(result).toEqual([]);
    });
  });

  // ── 3. Refund correction reduces net sales ──────────────────────────────────

  describe('getPosSummary — refund reduces net_sales', () => {
    it('refund correction reduces net_sales by refund amount', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 2,
            gross_sales: 200_000,
            discount_total: 0,
            tax_total: 0,
            service_charge_total: 0,
            void_amount: 0,
            void_count_from_status: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            refund_total: 75_000,
            refund_count: 1,
            void_correction_amount: 0,
            void_count: 0,
            return_total: 0,
            return_count: 0,
          },
        ]);

      const result = await service.getPosSummary({});
      expect(result.netSales).toBe(125_000); // 200_000 - 75_000
      expect(result.refundTotal).toBe(75_000);
      expect(result.refundCount).toBe(1);
    });
  });

  // ── 4. Voided sale excluded from gross/net ──────────────────────────────────

  describe('getPosSummary — voided sale policy', () => {
    it('voided sale is excluded from gross_sales and reported separately', async () => {
      // gross_sales only counts 'paid'/'partially_refunded' — voided is separate
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 2,
            gross_sales: 100_000, // only the paid sale
            discount_total: 0,
            tax_total: 0,
            service_charge_total: 0,
            void_amount: 80_000, // the voided sale total
            void_count_from_status: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            refund_total: 0,
            refund_count: 0,
            void_correction_amount: 80_000,
            void_count: 1,
            return_total: 0,
            return_count: 0,
          },
        ]);

      const result = await service.getPosSummary({});
      expect(result.grossSales).toBe(100_000); // voided excluded
      expect(result.voidAmount).toBe(80_000);
      expect(result.voidCount).toBe(1);
      expect(result.netSales).toBe(100_000); // no discounts or refunds
    });
  });

  // ── 5. Shift reconciliation ─────────────────────────────────────────────────

  describe('getShiftReconciliation', () => {
    const SESSION_ID = 42;

    function setupShiftMocks(opts: {
      openingCash: number;
      cashIncome: number;
      cashRefund: number;
      cashExpense: number;
      countedCash: number | null;
      grossSales: number;
      discountTotal: number;
      refundTotal: number;
    }) {
      const {
        openingCash,
        cashIncome,
        cashRefund,
        cashExpense,
        countedCash,
        grossSales,
        discountTotal,
        refundTotal,
      } = opts;

      prisma.cash_register_sessions.findUnique.mockResolvedValue({
        id: SESSION_ID,
        store_id: 'default-store',
        cashier_id: 'kasir01',
        status: countedCash != null ? 'closed' : 'open',
        opening_cash: openingCash,
        counted_cash: countedCash,
        opened_at: '2026-05-15T08:00:00.000Z',
        closed_at: countedCash != null ? '2026-05-15T17:00:00.000Z' : null,
      });

      // Sales query
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sale_count: 5,
            gross_sales: grossSales,
            discount_total: discountTotal,
            tax_total: 5_000,
            service_charge_total: 2_000,
            void_count: 0,
          },
        ])
        // Cashflow entries query
        .mockResolvedValueOnce([
          {
            entry_type: 'income',
            payment_method: 'Cash',
            total: cashIncome,
            count: 5,
          },
          ...(cashRefund > 0
            ? [
                {
                  entry_type: 'refund',
                  payment_method: 'Cash',
                  total: cashRefund,
                  count: 1,
                },
              ]
            : []),
          ...(cashExpense > 0
            ? [
                {
                  entry_type: 'expense',
                  payment_method: 'Cash',
                  total: cashExpense,
                  count: 1,
                },
              ]
            : []),
        ])
        // Corrections query
        .mockResolvedValueOnce(
          refundTotal > 0
            ? [{ type: 'refund', total_amount: refundTotal, count: 1 }]
            : [],
        );
    }

    it('reconciles cash correctly: expected = opening + income - refund - expense', async () => {
      setupShiftMocks({
        openingCash: 100_000,
        cashIncome: 500_000,
        cashRefund: 50_000,
        cashExpense: 20_000,
        countedCash: 530_000,
        grossSales: 500_000,
        discountTotal: 0,
        refundTotal: 50_000,
      });

      const result = await service.getShiftReconciliation(SESSION_ID);

      expect(result).not.toBeNull();
      expect(result!.cashReconciliation.openingCash).toBe(100_000);
      expect(result!.cashReconciliation.cashIncome).toBe(500_000);
      expect(result!.cashReconciliation.cashRefund).toBe(50_000);
      expect(result!.cashReconciliation.cashExpense).toBe(20_000);
      // expected = 100_000 + 500_000 - 50_000 - 20_000 = 530_000
      expect(result!.cashReconciliation.expectedCash).toBe(530_000);
      expect(result!.cashReconciliation.countedCash).toBe(530_000);
      expect(result!.cashReconciliation.variance).toBe(0);
    });

    it('reports positive variance when counted > expected', async () => {
      setupShiftMocks({
        openingCash: 50_000,
        cashIncome: 200_000,
        cashRefund: 0,
        cashExpense: 0,
        countedCash: 260_000, // 10_000 over
        grossSales: 200_000,
        discountTotal: 0,
        refundTotal: 0,
      });

      const result = await service.getShiftReconciliation(SESSION_ID);
      expect(result!.cashReconciliation.expectedCash).toBe(250_000);
      expect(result!.cashReconciliation.variance).toBe(10_000);
    });

    it('reports negative variance when counted < expected', async () => {
      setupShiftMocks({
        openingCash: 50_000,
        cashIncome: 200_000,
        cashRefund: 0,
        cashExpense: 0,
        countedCash: 230_000, // 20_000 short
        grossSales: 200_000,
        discountTotal: 0,
        refundTotal: 0,
      });

      const result = await service.getShiftReconciliation(SESSION_ID);
      expect(result!.cashReconciliation.variance).toBe(-20_000);
    });

    it('variance is null for open sessions (not yet counted)', async () => {
      setupShiftMocks({
        openingCash: 100_000,
        cashIncome: 300_000,
        cashRefund: 0,
        cashExpense: 0,
        countedCash: null,
        grossSales: 300_000,
        discountTotal: 0,
        refundTotal: 0,
      });

      const result = await service.getShiftReconciliation(SESSION_ID);
      expect(result!.cashReconciliation.countedCash).toBeNull();
      expect(result!.cashReconciliation.variance).toBeNull();
    });

    it('net_sales in shift = gross - discount - refund', async () => {
      setupShiftMocks({
        openingCash: 0,
        cashIncome: 400_000,
        cashRefund: 30_000,
        cashExpense: 0,
        countedCash: 370_000,
        grossSales: 400_000,
        discountTotal: 20_000,
        refundTotal: 30_000,
      });

      const result = await service.getShiftReconciliation(SESSION_ID);
      // net = 400_000 - 20_000 - 30_000 = 350_000
      expect(result!.sales.netSales).toBe(350_000);
    });

    it('returns null for non-existent session', async () => {
      prisma.cash_register_sessions.findUnique.mockResolvedValue(null);
      const result = await service.getShiftReconciliation(999);
      expect(result).toBeNull();
    });
  });

  // ── 6. getPosDaily ──────────────────────────────────────────────────────────

  describe('getPosDaily', () => {
    it('returns daily rows with net_sales computed', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sales_date: '2026-05-15',
            sale_count: 10,
            gross_sales: 1_000_000,
            discount_total: 50_000,
            tax_total: 100_000,
            service_charge_total: 20_000,
            void_count: 1,
          },
        ])
        .mockResolvedValueOnce([
          { correction_date: '2026-05-15', refund_total: 100_000 },
        ]);

      const result = await service.getPosDaily({});
      expect(result).toHaveLength(1);
      const day = result[0];
      expect(day.salesDate).toBe('2026-05-15');
      expect(day.grossSales).toBe(1_000_000);
      expect(day.discountTotal).toBe(50_000);
      expect(day.refundTotal).toBe(100_000);
      // net = 1_000_000 - 50_000 - 100_000 = 850_000
      expect(day.netSales).toBe(850_000);
    });
  });

  // ── 7. getPosTopProducts ────────────────────────────────────────────────────

  describe('getPosTopProducts', () => {
    it('returns products sorted by units_sold', async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          product_id: 1,
          name: 'Nasi Goreng',
          units_sold: 50,
          revenue: 500_000,
        },
        { product_id: 2, name: 'Es Teh', units_sold: 30, revenue: 150_000 },
      ]);

      const result = await service.getPosTopProducts({});
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Nasi Goreng');
      expect(result[0].unitsSold).toBe(50);
    });
  });

  // ── 8. getPosCorrections ────────────────────────────────────────────────────

  describe('getPosCorrections', () => {
    it('returns summary and records', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { type: 'refund', count: 2, total_amount: 80_000 },
          { type: 'void', count: 1, total_amount: 50_000 },
        ])
        .mockResolvedValueOnce([
          {
            id: 1,
            correction_number: 'COR-001',
            type: 'refund',
            reason: 'Customer complaint',
            operator_id: 'kasir01',
            amount: 40_000,
            created_at: '2026-05-15T10:00:00.000Z',
            receipt_number: 'R-STORE-20260515-1-0001',
            cashier_id: 'kasir01',
            original_total: 100_000,
            store_id: 'default-store',
          },
        ]);

      const result = await service.getPosCorrections({});
      expect(result.summary).toHaveLength(2);
      expect(result.summary[0].type).toBe('refund');
      expect(result.summary[0].totalAmount).toBe(80_000);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].correctionNumber).toBe('COR-001');
    });
  });
});
