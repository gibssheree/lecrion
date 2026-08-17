// apps/api/src/modules/payments/payments.service.spec.ts
//
// Smoke tests for PaymentsService — previously zero coverage (FIN-01).

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@libs/contracts/src/enums';
import { PaymentsService } from './payments.service';

function makeHarness() {
  const orders = new Map<number, any>([[1, { id: 1, status: 'pending' }]]);
  const payments = new Map<number, any>();
  let paymentIdSeq = 1;

  const tx = {
    payments: {
      update: jest.fn(async ({ where, data }: any) => {
        const row = payments.get(where.id);
        Object.assign(row, data);
        return row;
      }),
    },
    orders: {
      update: jest.fn(async ({ where, data }: any) => {
        const row = orders.get(where.id);
        Object.assign(row, data);
        return row;
      }),
    },
  };

  const prisma = {
    orders: {
      findUnique: jest.fn(async ({ where }: any) => orders.get(where.id) ?? null),
    },
    payments: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: paymentIdSeq++, ...data };
        payments.set(row.id, row);
        return row;
      }),
      findUnique: jest.fn(async ({ where }: any) => payments.get(where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) =>
        [...payments.values()].filter((p) =>
          where.order_id !== undefined
            ? p.order_id === where.order_id
            : p.store_id === where.store_id,
        ),
      ),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
  };

  const audit = { record: jest.fn() };
  const sync = { writeOutboxInTx: jest.fn().mockResolvedValue(undefined) };
  const service = new PaymentsService(prisma as any, audit as any, sync as any);
  return { service, prisma, tx, orders, payments };
}

describe('PaymentsService', () => {
  describe('recordPayment', () => {
    it('creates a pending payment for an existing order', async () => {
      const { service } = makeHarness();
      const result = await service.recordPayment({
        orderId: 1,
        amount: 25000,
        paymentMethod: 'QRIS',
        storeId: 'store-a',
      });
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.paymentId).toBeDefined();
    });

    it('throws NotFoundException for a non-existent order', async () => {
      const { service } = makeHarness();
      await expect(
        service.recordPayment({ orderId: 999, amount: 1000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    it('marks the payment paid and moves the order to confirmed', async () => {
      const { service, orders } = makeHarness();
      const { paymentId } = await service.recordPayment({
        orderId: 1,
        amount: 25000,
      });

      const result = await service.confirmPayment({
        paymentId,
        paidAmount: 25000,
      });

      expect(result.status).toBe(PaymentStatus.PAID);
      expect(orders.get(1).status).toBe('confirmed');
    });

    it('rejects confirming an already-paid payment', async () => {
      const { service } = makeHarness();
      const { paymentId } = await service.recordPayment({
        orderId: 1,
        amount: 25000,
      });
      await service.confirmPayment({ paymentId, paidAmount: 25000 });

      await expect(
        service.confirmPayment({ paymentId, paidAmount: 25000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for a non-existent payment', async () => {
      const { service } = makeHarness();
      await expect(
        service.confirmPayment({ paymentId: 999, paidAmount: 1000 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getPaymentsByOrder / getPaymentById', () => {
    it('lists payments for an order', async () => {
      const { service } = makeHarness();
      await service.recordPayment({ orderId: 1, amount: 25000 });
      const list = await service.getPaymentsByOrder(1);
      expect(list).toHaveLength(1);
    });

    it('throws NotFoundException for an unknown payment id', async () => {
      const { service } = makeHarness();
      await expect(service.getPaymentById(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
