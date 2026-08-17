// apps/api/src/modules/register/register.service.spec.ts
//
// Smoke tests for RegisterService — previously zero coverage (FIN-01).
// RegisterService wraps CashflowService (constructed for real here, against
// the same in-memory store, so the two collaborate the way they do in
// production) and adds its own session queries — this file's main job is
// regression coverage for the SEC-06 fix: every session lookup here
// (getSessionById, suspend/resume, summary, cash adjustment) must verify
// store ownership, since fixing CashflowService alone left this module's
// own queries as an identical hole behind a different controller.

import { NotFoundException } from '@nestjs/common';
import { RegisterSessionStatus } from '@libs/contracts/src/enums';
import { RegisterService } from './register.service';
import { CashflowService } from '../cashflow/cashflow.service';

function makeHarness() {
  const sessions = new Map<number, any>();
  const entries: any[] = [];
  let sessionIdSeq = 1;
  let entryIdSeq = 1;

  const prisma = {
    cash_register_sessions: {
      findFirst: jest.fn(async ({ where }: any) =>
        [...sessions.values()].find((s) => {
          if (where.id !== undefined && s.id !== where.id) return false;
          if (where.store_id !== undefined && s.store_id !== where.store_id)
            return false;
          if (where.status !== undefined && s.status !== where.status)
            return false;
          return true;
        }) ?? null,
      ),
      findUnique: jest.fn(async ({ where }: any) => sessions.get(where.id) ?? null),
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
    payments: { findMany: jest.fn(async () => []) },
    orders: { findMany: jest.fn(async () => []) },
    order_items: { findMany: jest.fn(async () => []) },
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
  const cashflow = new CashflowService(prisma as any, audit as any);
  const service = new RegisterService(cashflow, prisma as any);
  return { service, cashflow, prisma, sessions, entries };
}

describe('RegisterService', () => {
  it('opens and closes a session via the wrapped CashflowService', async () => {
    const { service } = makeHarness();
    const opened = await service.openSession('store-a', { cashierId: 'c1' });
    const closed = await service.closeSession('store-a', {
      sessionId: opened.sessionId,
      countedCash: 0,
      operatorId: 'c1',
    });
    expect(closed.sessionId).toBe(opened.sessionId);
  });

  describe('store ownership (SEC-06 — same hole, different door)', () => {
    it('getSessionById returns null for a session in another store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      const result = await service.getSessionById(sessionId, 'store-b');
      expect(result).toBeNull();
    });

    it('getSessionById returns the session for its own store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      const result = await service.getSessionById(sessionId, 'store-a');
      expect(result?.id).toBe(sessionId);
    });

    it('suspendSession rejects a session in another store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.suspendSession(sessionId, 'store-b', 'attacker'),
      ).rejects.toThrow();
    });

    it('resumeSession rejects a session in another store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await service.suspendSession(sessionId, 'store-a', 'c1');
      await expect(
        service.resumeSession(sessionId, 'store-b', 'attacker'),
      ).rejects.toThrow();
    });

    it('getSessionSummary throws NotFoundException for a session in another store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.getSessionSummary(sessionId, 'store-b'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('recordCashAdjustment throws NotFoundException for a session in another store', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      await expect(
        service.recordCashAdjustment(sessionId, 'store-b', {
          adjustmentType: 'cash_in',
          amount: 1000,
          operatorId: 'attacker',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('recordCashAdjustment', () => {
    it('records a cash_in adjustment against the session', async () => {
      const { service, entries } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
      });
      const result = await service.recordCashAdjustment(sessionId, 'store-a', {
        adjustmentType: 'cash_in',
        amount: 15000,
        operatorId: 'c1',
      });
      expect(result.amount).toBe(15000);
      expect(entries).toHaveLength(1);
      expect(entries[0].entry_type).toBe('income');
    });

    it('rejects an adjustment on a closed session', async () => {
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
        service.recordCashAdjustment(sessionId, 'store-a', {
          adjustmentType: 'cash_out',
          amount: 5000,
          operatorId: 'c1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getSessionSummary', () => {
    it('computes expectedCash from opening cash + ledger entries', async () => {
      const { service } = makeHarness();
      const { sessionId } = await service.openSession('store-a', {
        cashierId: 'c1',
        openingCash: 50000,
      });
      await service.recordCashAdjustment(sessionId, 'store-a', {
        adjustmentType: 'cash_in',
        amount: 10000,
        operatorId: 'c1',
      });

      const summary = await service.getSessionSummary(sessionId, 'store-a');
      expect(summary.openingCash).toBe(50000);
      expect(summary.cashIn).toBe(10000);
      expect(summary.expectedCash).toBe(60000);
    });
  });
});
