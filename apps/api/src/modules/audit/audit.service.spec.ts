// apps/api/src/modules/audit/audit.service.spec.ts
//
// Regression coverage for SEC-12: the audit trail is the anti-fraud feature
// sold on the pricing page, and its own read path was leaking across stores.

import { AuditService } from './audit.service';

function makeHarness() {
  const rows = [
    { id: 1, store_id: 'store-a', actor: 'kasir-a', action: 'pos.void', resource: 'orders' },
    { id: 2, store_id: 'store-b', actor: 'kasir-b', action: 'pos.void', resource: 'orders' },
    { id: 3, store_id: 'store-a', actor: 'owner-a', action: 'product.updated', resource: 'menu' },
  ];

  const prisma = {
    audit_logs: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn(async ({ where, take }: any) =>
        rows
          .filter((r) => {
            if (where.store_id !== undefined && r.store_id !== where.store_id)
              return false;
            if (where.actor !== undefined && r.actor !== where.actor) return false;
            if (where.action !== undefined && r.action !== where.action)
              return false;
            if (where.resource !== undefined && r.resource !== where.resource)
              return false;
            return true;
          })
          .slice(0, take),
      ),
    },
  };

  return { service: new AuditService(prisma as any), prisma };
}

describe('AuditService.query', () => {
  it('returns only the requested store\'s entries (SEC-12)', async () => {
    const { service } = makeHarness();
    const logs = await service.query({ storeId: 'store-a' });

    expect(logs).toHaveLength(2);
    expect(logs.every((l: any) => l.store_id === 'store-a')).toBe(true);
  });

  it('never leaks another store\'s rows even when other filters match', async () => {
    const { service } = makeHarness();
    // 'pos.void' exists in both stores — the store filter must still win.
    const logs = await service.query({
      storeId: 'store-a',
      action: 'pos.void',
    });

    expect(logs).toHaveLength(1);
    expect((logs[0] as any).store_id).toBe('store-a');
  });

  it('always passes store_id to the query', async () => {
    const { service, prisma } = makeHarness();
    await service.query({ storeId: 'store-b' });

    expect(prisma.audit_logs.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ store_id: 'store-b' }),
      }),
    );
  });
});
