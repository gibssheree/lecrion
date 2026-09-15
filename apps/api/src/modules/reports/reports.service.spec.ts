// apps/api/src/modules/reports/reports.service.spec.ts
//
// Regression coverage for SEC-13: the legacy reports endpoints (summary,
// daily, by-payment, by-type, top-products, stock-changes, year/month
// bundles) ran with no store filter at all, so every merchant's dashboard
// showed platform-wide merged totals — reproducible with the demo-cafe /
// demo-hotel tenants (a cafe's "best seller" listed a hotel room).

import { ReportsService } from './reports.service';

function makePrisma() {
  return { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };
}

describe('ReportsService store scoping (SEC-13)', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReportsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ReportsService(prisma as any);
  });

  it('getSalesSummary filters by store_id', async () => {
    await service.getSalesSummary('store-a');
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('o.store_id = ?');
    expect(params).toContain('store-a');
  });

  it('getSalesByPayment filters by store_id', async () => {
    await service.getSalesByPayment('store-a');
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('o.store_id = ?');
    expect(params.every((p: string) => p === 'store-a')).toBe(true);
  });

  it('getSalesByType filters by store_id', async () => {
    await service.getSalesByType('store-a');
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('o.store_id = ?');
    expect(params.every((p: string) => p === 'store-a')).toBe(true);
  });

  it('getSalesDaily filters by store_id', async () => {
    await service.getSalesDaily('store-a', 14);
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('o.store_id = ?');
    expect(params).toContain('store-a');
  });

  it('getSalesTopProducts filters by store_id', async () => {
    await service.getSalesTopProducts({ storeId: 'store-a', limit: 5 });
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('o.store_id = ?');
    expect(params).toContain('store-a');
  });

  it('getStockChangeLogs filters by store_id', async () => {
    await service.getStockChangeLogs('store-a', 30);
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
    expect(sql).toContain('scl.store_id = ?');
    expect(params).toContain('store-a');
  });

  it('getYearDetailBundle threads store_id into every sub-query', async () => {
    await service.getYearDetailBundle('store-a', 2026);
    for (const call of prisma.$queryRawUnsafe.mock.calls) {
      expect(call.slice(1)).toContain('store-a');
    }
  });

  it('getMonthDetailBundle threads store_id into every sub-query', async () => {
    await service.getMonthDetailBundle('store-a', 2026, 9);
    for (const call of prisma.$queryRawUnsafe.mock.calls) {
      expect(call.slice(1)).toContain('store-a');
    }
  });
});
