// apps/api/src/modules/pos/pos-corrections.service.spec.ts
//
// Tests for Phase 5 enterprise correction flows.

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CashflowEntryType,
  OrderStatus,
  PaymentStatus,
  PosCorrectionType,
  PosSaleStatus,
  StockMovementType,
} from '@libs/contracts/src/enums';
import {
  CASHFLOW_EVENTS,
  ORDER_EVENTS,
  POS_CORRECTION_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { PosCorrectionsService } from './pos-corrections.service';

// ── Harness ───────────────────────────────────────────────────────────────────

function makeOrder(
  overrides: Partial<{
    id: number;
    status: string;
    payments: any[];
    order_items: any[];
  }> = {},
) {
  return {
    id: 1,
    status: OrderStatus.CONFIRMED,
    cancelled_at: null,
    cancellation_reason: null,
    payments: [
      {
        id: 10,
        amount: 20000,
        paid_amount: 25000,
        payment_method: 'Cash',
        status: PaymentStatus.PAID,
        store_id: 'default-store',
      },
    ],
    order_items: [{ menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 }],
    ...overrides,
  };
}

function makeHarness(
  order: ReturnType<typeof makeOrder> | null = makeOrder(),
  previousCorrections: Array<{ amount: number }> = [],
  previousReturns: Array<{ menu_id: number; qty_change: number }> = [],
) {
  const tx = {
    orders: { update: jest.fn().mockResolvedValue({}) },
    pos_sales: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 321, receipt_number: 'R-001' }),
      update: jest.fn().mockResolvedValue({}),
    },
    pos_corrections: {
      create: jest.fn().mockResolvedValue({
        id: 654,
        correction_number: 'COR-REFUND-20260515-1-123',
      }),
    },
    payments: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    cashflow_entries: {
      findFirst: jest.fn().mockResolvedValue({
        id: 99,
        session_id: 5,
        store_id: 'default-store',
      }),
      create: jest.fn().mockResolvedValue({ id: 100 }),
    },
    cash_register_sessions: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 5, store_id: 'default-store' }),
    },
    menu: {
      findUnique: jest.fn().mockResolvedValue({ stock: 10 }),
      update: jest.fn().mockResolvedValue({}),
    },
    stock_change_logs: { create: jest.fn().mockResolvedValue({ id: 200 }) },
    sync_outbox: { create: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    orders: { findUnique: jest.fn().mockResolvedValue(order) },
    pos_corrections: {
      findMany: jest.fn().mockResolvedValue(previousCorrections),
    },
    stock_change_logs: {
      findMany: jest.fn().mockResolvedValue(previousReturns),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
  };

  const audit = { record: jest.fn() };
  const sync = { writeOutboxInTx: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emit: jest.fn() };
  const ledger = { writeMovement: jest.fn().mockResolvedValue({}) };
  const approval = {
    checkVoidPolicy: jest.fn().mockReturnValue({ required: false }),
    checkRefundPolicy: jest.fn().mockReturnValue({ required: false }),
    checkDiscountPolicy: jest.fn().mockReturnValue({ required: false }),
    verifyManagerPin: jest.fn(),
    inlineApprove: jest.fn().mockResolvedValue({ approvalId: 99 }),
    requireApprovedApproval: jest.fn().mockResolvedValue({ id: 77 }),
  };

  const service = new PosCorrectionsService(
    prisma as any,
    audit as any,
    sync as any,
    realtime as any,
    ledger as any,
    approval as any,
  );

  return { service, prisma, tx, audit, sync, realtime, approval };
}

// ── Void tests ────────────────────────────────────────────────────────────────

describe('PosCorrectionsService.voidOrder', () => {
  it('voids a confirmed unpaid order and creates correction document', async () => {
    const order = makeOrder({
      payments: [
        {
          id: 10,
          amount: 20000,
          paid_amount: 0,
          payment_method: 'Cash',
          status: PaymentStatus.PENDING,
          store_id: 'default-store',
        },
      ],
    });
    const { service, tx, sync, audit, realtime } = makeHarness(order);

    const result = await service.voidOrder(1, {
      reason: 'customer changed mind',
    });

    expect(tx.orders.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: OrderStatus.CANCELLED,
        cancellation_reason: 'voided: customer changed mind',
      }),
    });
    expect(tx.pos_sales.update).toHaveBeenCalledWith({
      where: { id: 321 },
      data: { status: PosSaleStatus.VOIDED },
    });
    expect(tx.pos_corrections.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PosCorrectionType.VOID,
          amount: 0,
        }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      ORDER_EVENTS.CANCELLED,
      expect.any(Object),
      expect.any(Object),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      POS_CORRECTION_EVENTS.CREATED,
      expect.objectContaining({ type: PosCorrectionType.VOID }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: ORDER_EVENTS.CANCELLED }),
    );
    expect(realtime.emit).toHaveBeenCalledWith(
      ORDER_EVENTS.CANCELLED,
      expect.any(Object),
    );
    expect(result.status).toBe(OrderStatus.CANCELLED);
    expect(result.correctionNumber).toMatch(/^COR-VOID-/);
  });

  it('rejects void of order with paid payments', async () => {
    const { service } = makeHarness();
    await expect(
      service.voidOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects void of already cancelled order', async () => {
    const { service } = makeHarness(
      makeOrder({ status: OrderStatus.CANCELLED }),
    );
    await expect(
      service.voidOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects void when reason is empty', async () => {
    const { service } = makeHarness();
    await expect(
      service.voidOrder(1, { reason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for unknown order', async () => {
    const { service } = makeHarness(null);
    await expect(
      service.voidOrder(999, { reason: 'test' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ── Refund tests ──────────────────────────────────────────────────────────────

describe('PosCorrectionsService.refundOrder — full cash refund', () => {
  it('full refund: sets order REFUNDED, creates cashflow entry, correction document', async () => {
    const { service, tx, sync, audit, realtime } = makeHarness();

    const result = await service.refundOrder(1, { reason: 'wrong item' });

    expect(tx.orders.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: OrderStatus.REFUNDED },
    });
    expect(tx.pos_sales.update).toHaveBeenCalledWith({
      where: { id: 321 },
      data: { status: PosSaleStatus.REFUNDED },
    });
    expect(tx.payments.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: PaymentStatus.REFUNDED },
    });
    expect(tx.cashflow_entries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entry_type: CashflowEntryType.REFUND,
          amount: 20000,
          payment_method: 'Cash',
          category: 'pos_refund',
        }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      CASHFLOW_EVENTS.REFUND_RECORDED,
      expect.any(Object),
      expect.any(Object),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      ORDER_EVENTS.REFUNDED,
      expect.objectContaining({ orderId: 1, refundAmount: 20000 }),
      expect.any(Object),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      POS_CORRECTION_EVENTS.CREATED,
      expect.objectContaining({ type: PosCorrectionType.REFUND }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: ORDER_EVENTS.REFUNDED }),
    );
    expect(realtime.emit).toHaveBeenCalledWith(
      ORDER_EVENTS.REFUNDED,
      expect.any(Object),
    );
    expect(result.status).toBe(OrderStatus.REFUNDED);
    expect(result.refundAmount).toBe(20000);
    expect(result.cashflowEntriesCreated).toBe(1);
    expect(result.remainingRefundable).toBe(0);
    expect(result.correctionNumber).toMatch(/^COR-REFUND-/);
  });

  it('full refund: does NOT create cashflow entry for non-cash payment', async () => {
    const order = makeOrder({
      payments: [
        {
          id: 11,
          amount: 20000,
          paid_amount: 20000,
          payment_method: 'QRIS',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
      ],
    });
    const { service, tx } = makeHarness(order);

    const result = await service.refundOrder(1, { reason: 'wrong item' });

    expect(tx.cashflow_entries.create).not.toHaveBeenCalled();
    expect(result.cashflowEntriesCreated).toBe(0);
    expect(result.status).toBe(OrderStatus.REFUNDED);
  });

  it('uses an existing approved manager approval id for threshold refunds', async () => {
    const { service, tx, approval } = makeHarness();
    approval.checkRefundPolicy.mockReturnValue({
      required: true,
      reason: 'Refund requires manager approval',
    });

    const result = await service.refundOrder(1, {
      reason: 'manager approved refund',
      managerApprovalId: 77,
    });

    expect(approval.requireApprovedApproval).toHaveBeenCalledWith(
      77,
      'refund',
    );
    expect(approval.inlineApprove).not.toHaveBeenCalled();
    expect(tx.pos_corrections.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ manager_approval_id: 77 }),
      }),
    );
    expect(result.status).toBe(OrderStatus.REFUNDED);
  });
});

describe('PosCorrectionsService.refundOrder — partial refund', () => {
  it('partial item refund: sets order PARTIALLY_REFUNDED, creates partial cashflow entry', async () => {
    // Order has 2 items: Nasi Goreng (qty 2, price 10000) + Es Teh (qty 1, price 5000)
    const order = makeOrder({
      payments: [
        {
          id: 10,
          amount: 25000,
          paid_amount: 25000,
          payment_method: 'Cash',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
      ],
      order_items: [
        { menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 },
        { menu_id: 2, name: 'Es Teh', price: 5000, qty: 1 },
      ],
    });
    const { service, tx } = makeHarness(order);

    // Refund only 1 Nasi Goreng (10000)
    const result = await service.refundOrder(1, {
      items: [{ productId: 1, refundQty: 1 }],
      reason: 'customer changed mind',
    });

    expect(result.status).toBe(OrderStatus.PARTIALLY_REFUNDED);
    expect(result.refundAmount).toBe(10000);
    expect(result.remainingRefundable).toBe(15000);
    expect(result.refundedLines).toHaveLength(1);
    expect(result.refundedLines[0]).toMatchObject({
      productId: 1,
      refundQty: 1,
      lineRefundAmount: 10000,
    });
    expect(tx.cashflow_entries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 10000,
          entry_type: CashflowEntryType.REFUND,
        }),
      }),
    );
    expect(tx.pos_sales.update).toHaveBeenCalledWith({
      where: { id: 321 },
      data: { status: PosSaleStatus.PARTIALLY_REFUNDED },
    });
  });

  it('second partial refund: accounts for previously refunded amount', async () => {
    const order = makeOrder({
      status: OrderStatus.PARTIALLY_REFUNDED,
      payments: [
        {
          id: 10,
          amount: 25000,
          paid_amount: 25000,
          payment_method: 'Cash',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
      ],
      order_items: [
        { menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 },
        { menu_id: 2, name: 'Es Teh', price: 5000, qty: 1 },
      ],
    });
    // Previously refunded 10000
    const { service, tx } = makeHarness(order, [{ amount: 10000 }]);

    // Refund remaining Es Teh (5000)
    const result = await service.refundOrder(1, {
      items: [{ productId: 2, refundQty: 1 }],
      reason: 'wrong order',
    });

    expect(result.previouslyRefunded).toBe(10000);
    expect(result.refundAmount).toBe(5000);
    expect(result.remainingRefundable).toBe(10000); // 25000 - 10000 - 5000
    expect(result.status).toBe(OrderStatus.PARTIALLY_REFUNDED);
  });

  it('rejects refund when amount exceeds remaining refundable', async () => {
    const order = makeOrder({
      status: OrderStatus.PARTIALLY_REFUNDED,
      payments: [
        {
          id: 10,
          amount: 20000,
          paid_amount: 20000,
          payment_method: 'Cash',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
      ],
      order_items: [{ menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 }],
    });
    // Already refunded 15000 — only 5000 left
    const { service } = makeHarness(order, [{ amount: 15000 }]);

    // Try to refund 2 items (20000) — exceeds remaining 5000
    await expect(
      service.refundOrder(1, {
        items: [{ productId: 1, refundQty: 2 }],
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund when already fully refunded', async () => {
    const order = makeOrder({ status: OrderStatus.PARTIALLY_REFUNDED });
    const { service } = makeHarness(order, [{ amount: 20000 }]);

    await expect(
      service.refundOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund of already refunded order', async () => {
    const { service } = makeHarness(
      makeOrder({ status: OrderStatus.REFUNDED }),
    );
    await expect(
      service.refundOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund of cancelled order', async () => {
    const { service } = makeHarness(
      makeOrder({ status: OrderStatus.CANCELLED }),
    );
    await expect(
      service.refundOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund when no paid payments exist', async () => {
    const order = makeOrder({
      payments: [
        {
          id: 12,
          amount: 20000,
          paid_amount: 0,
          payment_method: 'Cash',
          status: PaymentStatus.PENDING,
          store_id: 'default-store',
        },
      ],
    });
    const { service } = makeHarness(order);
    await expect(
      service.refundOrder(1, { reason: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects refund when reason is empty', async () => {
    const { service } = makeHarness();
    await expect(service.refundOrder(1, { reason: '' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allocates refund to cash first in split payment', async () => {
    const order = makeOrder({
      payments: [
        {
          id: 10,
          amount: 10000,
          paid_amount: 10000,
          payment_method: 'Cash',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
        {
          id: 11,
          amount: 10000,
          paid_amount: 10000,
          payment_method: 'QRIS',
          status: PaymentStatus.PAID,
          store_id: 'default-store',
        },
      ],
      order_items: [{ menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 }],
    });
    const { service, tx } = makeHarness(order);

    // Refund 1 item (10000) — should come from cash first
    const result = await service.refundOrder(1, {
      items: [{ productId: 1, refundQty: 1 }],
      reason: 'test',
    });

    expect(result.paymentAllocations).toHaveLength(1);
    expect(result.paymentAllocations[0]).toMatchObject({
      paymentId: 10,
      method: 'Cash',
      refundAmount: 10000,
      isCash: true,
    });
    expect(tx.cashflow_entries.create).toHaveBeenCalledTimes(1);
    expect(result.cashflowEntriesCreated).toBe(1);
  });
});

// ── Return items tests ────────────────────────────────────────────────────────

describe('PosCorrectionsService.returnItems', () => {
  it('returns items, writes stock-in movement, creates correction document', async () => {
    const { service, tx, sync, audit } = makeHarness();

    const result = await service.returnItems(1, {
      items: [{ productId: 1, returnQty: 1 }],
      reason: 'customer returned',
    });

    expect(tx.menu.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stock: 11 },
    });
    expect(tx.stock_change_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          menu_id: 1,
          order_id: 1,
          change_type: StockMovementType.RETURN,
          qty_before: 10,
          qty_change: 1,
          qty_after: 11,
        }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      STOCK_EVENTS.ADJUSTED,
      expect.objectContaining({
        productId: 1,
        qtyChange: 1,
        reason: StockMovementType.RETURN,
      }),
      expect.any(Object),
    );
    expect(tx.pos_corrections.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: PosCorrectionType.RETURN,
          amount: 0,
        }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      POS_CORRECTION_EVENTS.CREATED,
      expect.objectContaining({ type: PosCorrectionType.RETURN }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'order.return_items' }),
    );
    expect(result.returnedItems).toHaveLength(1);
    expect(result.returnedItems[0]).toMatchObject({
      productId: 1,
      returnQty: 1,
      stockBefore: 10,
      stockAfter: 11,
    });
    expect(result.correctionNumber).toMatch(/^COR-RETURN-/);
  });

  it('rejects return qty exceeding sold qty', async () => {
    const { service } = makeHarness();
    await expect(
      service.returnItems(1, {
        items: [{ productId: 1, returnQty: 5 }],
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects return qty exceeding remaining returnable (already returned some)', async () => {
    const { service } = makeHarness(
      makeOrder(),
      [],
      [{ menu_id: 1, qty_change: 1 }],
    );
    // sold 2, already returned 1, remaining 1 — try to return 2
    await expect(
      service.returnItems(1, {
        items: [{ productId: 1, returnQty: 2 }],
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects return of product not in order', async () => {
    const { service } = makeHarness();
    await expect(
      service.returnItems(1, {
        items: [{ productId: 999, returnQty: 1 }],
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects return when reason is empty', async () => {
    const { service } = makeHarness();
    await expect(
      service.returnItems(1, {
        items: [{ productId: 1, returnQty: 1 }],
        reason: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for unknown order', async () => {
    const { service } = makeHarness(null);
    await expect(
      service.returnItems(999, {
        items: [{ productId: 1, returnQty: 1 }],
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('return is independent of refund — does not change order status', async () => {
    const { service, tx } = makeHarness();
    await service.returnItems(1, {
      items: [{ productId: 1, returnQty: 1 }],
      reason: 'test',
    });
    expect(tx.orders.update).not.toHaveBeenCalled();
  });
});
