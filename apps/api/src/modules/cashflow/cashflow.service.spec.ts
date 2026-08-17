// apps/api/src/modules/cashflow/cashflow.service.spec.ts
//
// Smoke tests for CashflowService — previously zero coverage (FIN-01).
// Focus: the core session/entry lifecycle, and regression coverage for the
// SEC-06 fixes (store_id sourced from the caller, not trusted from a client
// body; every session lookup verifies store ownership before acting).

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RegisterSessionStatus, CashflowEntryType } from '@libs/contracts/src/enums';
import { CashflowService } from './cashflow.service';

function makeHarness() {
  const sessions = new Map<number, any>();
  const entries: any[] = [];
  let sessionIdSeq = 1;
  let entryIdSeq = 1;

  const prisma = {
    cash_register_sessions: {
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          [...sessions.values()].find((s) => {
            if (where.id !== undefined && s.id !== where.id) return false;
            if (where.store_id !== undefined && s.store_id !== where.store_id)
              return false;
            if (where.status !== undefined && s.status !== where.status)
              return false;
            return true;
          }) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: sessionIdSeq++, status: 'open', ...data };
        sessions.set(row.id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = sessions.get(where.id);
        Object.assign(row, data);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        [...sessions.values()].filter((s) => s.store_id === where.store_id),
      ),
    },
    cashflow_entries: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: entryIdSeq++, ...data };
        entries.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        entries.filter((e) => e.session_id === where.session_id),
      ),
    },
    $queryRawUnsafe: jest.fn(async (_sql: string, sessionId: number) => {
      const rows = entries.filter((e) => e.session_id === sessionId);
      const byType = new Map<string, number>();
      for (const r of rows) {
        if (String(r.payment_method).toLowerCase() !== 'cash') continue;
        byType.set(r.entry_type, (byType.get(r.entry_type) ?? 0) + r.amount);
      }
      return [...byType.entries()].map(([entry_type, total]) => ({
        entry_type,
        total,
      }));
    }),
  };

  const audit = { record: jest.fn() };
  const service = new CashflowService(prisma as any, audit as any);
  return { service, prisma, sessions, entries };
}

describe('CashflowService', () => {
  describe('openSession', () => {
    it('opens a session for the given store', async () => {
      const { service, sessions } = makeHarness();
      const result = await service.openSession('store-a', {
        cashierId: 'cashier-1',
        openingCash: 100000,
      });
      expect(result.sessionId).toBeDefined();
      expect(sessions.get(result.sessionId).store_id).toBe('store-a');
    });

    it('rejects opening a second session for a store that already has one open', async () => {
      const { service } = makeHarness();
      await service.openSession('store-a', { cashierId: 'cashier-1' });
      await expect(
        service.openSession('store-a', { cashierId: 'cashier-2' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not let two different stores collide (SEC-06 regression)', async () => {
      const { service, sessions } = makeHarness();
      const a = await service.openSession('store-a', { cashierId: 'c1' });
      const b = await service.openSession('store-b', { cashierId: 'c2' });
      expect(sessions.get(a.sessionId).store_id).toBe('store-a');
      expect(sessions.get(b.sessionId).store_id).toBe('store-b');
    });
  });

  describe('recordEntry', () => {
    it('records an entry against the caller store\'s active session', async () => {
      const { service, entries } = makeHarness();
      await service.openSession('store-a', { cashierId: 'c1' });
      const result = await service.recordEntry('store-a', {
        entryType: CashflowEntryType.INCOME,
        amount: 50000,
        operatorId: 'c1',
        paymentMethod: 'Cash',
      });
      expect(result.entryId).toBeDefined();
      expect(entries[0].store_id).toBe('store-a');
    });

    it('rejects an invalid entryType', async () => {
      const { service } = makeHarness();
      await service.openSession('store-a', { cashierId: 'c1' });
      await expect(
        service.recordEntry('store-a', {
          entryType: 'not_a_real_type' as any,
          amount: 1000,
          operatorId: 'c1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a non-positive amount', async () => {
      const { service } = makeHarness();
      await service.openSession('store-a', { cashierId: 'c1' });
      await expect(
        service.recordEntry('store-a', {
          entryType: CashflowEntryType.INCOME,
          amount: 0,
          operatorId: 'c1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when there is no open session for the store', async () => {
      const { service } = makeHarness();
      await expect(
        service.recordEntry('store-a', {
          entryType: CashflowEntryType.INCOME,
          amount: 1000,
          operatorId: 'c1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an explicit sessionId belonging to another store (SEC-06 regression)', async () => {
      const { service } = makeHarness();
      const other = await service.openSession('store-b', { cashierId: 'c2' });
      await expect(
        service.recordEntry('store-a', {
          entryType: CashflowEntryType.INCOME,
          amount: 1000,
          operatorId: 'attacker',
          sessionId: other.sessionId,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('closeSession', () => {
    it('computes variance = counted - expected', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
        openingCash: 100000,
      });
      await service.recordEntry('store-a', {
        entryType: CashflowEntryType.INCOME,
        amount: 20000,
        operatorId: 'c1',
        paymentMethod: 'Cash',
        sessionId,
      });

      const result = await service.closeSession('store-a', {
        sessionId,
        countedCash: 125000,
        operatorId: 'c1',
      });

      // expected = balance(20000) + opening(100000) = 120000
      expect(result.expected).toBe(120000);
      expect(result.variance).toBe(5000);
    });

    it('rejects closing a session that belongs to another store (SEC-06 regression)', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.closeSession('store-b', {
          sessionId,
          countedCash: 0,
          operatorId: 'attacker',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects closing an already-closed session', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await service.closeSession('store-a', {
        sessionId,
        countedCash: 0,
        operatorId: 'c1',
      });
      await expect(
        service.closeSession('store-a', {
          sessionId,
          countedCash: 0,
          operatorId: 'c1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getSessionBalance / listEntries store ownership', () => {
    it('rejects reading balance for a session in another store (SEC-06 regression)', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.getSessionBalance(sessionId, 'store-b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects listing entries for a session in another store (SEC-06 regression)', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.listEntries(sessionId, 'store-b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
