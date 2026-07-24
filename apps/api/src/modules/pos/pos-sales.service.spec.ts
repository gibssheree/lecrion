import { BadRequestException } from '@nestjs/common';
import {
  CashflowEntryType,
  OrderStatus,
  PaymentStatus,
  PosSaleStatus,
  RegisterSessionStatus,
  StockMovementType,
} from '@libs/contracts/src/enums';
import {
  CASHFLOW_EVENTS,
  PAYMENT_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { PosSalesService } from './pos-sales.service';
import { CreatePosSaleDto, PosSaleReceipt } from './pos-sales.dto';
import { PosCalculationService } from './pos-calculation.service';

describe('PosSalesService', () => {
  function makeDto(
    overrides: Partial<CreatePosSaleDto> = {},
  ): CreatePosSaleDto {
    return {
      clientSaleId: 'sale-1',
      registerSessionId: 10,
      storeId: 'store-1',
      cashierId: 'cashier-1',
      customerName: 'Walk-in',
      orderType: 'pickup',
      items: [{ productId: 1, qty: 2 }],
      payments: [{ method: 'Cash', amount: 20000, paidAmount: 25000 }],
      ...overrides,
    };
  }

  function makeHarness(options: { cachedReceipt?: PosSaleReceipt } = {}) {
    const tx = {
      idempotency_keys: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      cash_register_sessions: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          store_id: 'store-1',
          status: RegisterSessionStatus.OPEN,
          opening_cash: 100000,
          expected_cash: 100000,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      menu: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 1, name: 'Nasi Goreng', price: 10000, stock: 5 },
          ]),
        update: jest.fn().mockResolvedValue({}),
      },
      orders: {
        create: jest.fn().mockResolvedValue({ id: 123 }),
      },
      order_items: {
        create: jest.fn().mockResolvedValue({}),
      },
      stock_change_logs: {
        create: jest.fn().mockResolvedValue({}),
      },
      payments: {
        create: jest.fn().mockResolvedValue({ id: 456 }),
      },
      receipt_sequences: {
        upsert: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
      pos_sales: {
        create: jest.fn().mockResolvedValue({ id: 321 }),
      },
      pos_sale_items: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      cashflow_entries: {
        create: jest.fn().mockResolvedValue({ id: 789 }),
      },
      audit_logs: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const prisma = {
      idempotency_keys: {
        findFirst: jest.fn().mockResolvedValue(
          options.cachedReceipt
            ? {
                key: `pos-sale:${options.cachedReceipt.saleId}`,
                result: JSON.stringify(options.cachedReceipt),
                expires_at: new Date(Date.now() + 60_000).toISOString(),
              }
            : null,
        ),
      },
      orders: {
        findUnique: jest.fn(),
      },
      pos_sales: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      cashflow_entries: {
        findFirst: jest.fn(),
      },
      audit_logs: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    const users = {
      ensureUserByPhone: jest.fn().mockResolvedValue({
        userId: 77,
        phoneDigits: '',
        email: 'guest@wa.local',
        created: false,
      }),
    };
    const sync = {
      writeOutboxInTx: jest.fn().mockResolvedValue(undefined),
    };
    const readModel = {
      rebuildAll: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PosSalesService(
      prisma as any,
      users as any,
      sync as any,
      readModel as any,
      new PosCalculationService({ getSettings: async () => ({}) } as any),
      {
        getSetting: async () => '',
        getCapabilities: async () => ({ enabledModules: [] }),
      } as any,
      { createTicketForOrder: async () => null } as any,
      { emitKitchenTicketCreated: () => undefined } as any,
    );

    return { service, prisma, tx, users, sync, readModel };
  }

  // ── Existing tests ────────────────────────────────────────────────────────

  it('creates one atomic paid cash sale with cashflow and stock log', async () => {
    const { service, tx, sync, readModel } = makeHarness();

    const receipt = await service.createSale(makeDto());

    expect(receipt).toMatchObject({
      saleId: 'sale-1',
      orderId: 123,
      registerSessionId: 10,
      total: 20000,
      paidTotal: 25000,
      change: 5000,
      paymentMethods: ['Cash'],
    });
    expect(receipt.receiptNumber).toMatch(/^R-STORE1-\d{8}-10-0001$/);
    expect(receipt.paymentLines).toEqual([
      {
        method: 'Cash',
        amount: 20000,
        paidAmount: 25000,
        reference: undefined,
      },
    ]);
    expect(tx.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payment_method: 'Cash',
          status: OrderStatus.CONFIRMED,
        }),
      }),
    );
    expect(tx.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 20000,
          paid_amount: 25000,
          payment_method: 'Cash',
          status: PaymentStatus.PAID,
        }),
      }),
    );
    expect(tx.cashflow_entries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entry_type: CashflowEntryType.INCOME,
          amount: 20000,
          payment_method: 'Cash',
          reference_id: '123',
        }),
      }),
    );
    expect(tx.cash_register_sessions.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { expected_cash: { increment: 20000 } },
    });
    expect(tx.receipt_sequences.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          store_id_register_session_id_business_date: {
            store_id: 'store-1',
            register_session_id: 10,
            business_date: expect.any(String),
          },
        },
      }),
    );
    expect(tx.pos_sales.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receipt_number: expect.stringMatching(/^R-STORE1-\d{8}-10-0001$/),
          order_id: 123,
          register_session_id: 10,
          status: PosSaleStatus.PAID,
          subtotal: 20000,
          total: 20000,
          paid_total: 25000,
          change_amount: 5000,
        }),
      }),
    );
    expect(tx.pos_sale_items.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            sale_id: 321,
            product_id: 1,
            qty: 2,
            line_total: 20000,
          }),
        ],
      }),
    );
    expect(tx.stock_change_logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          change_type: StockMovementType.SALE,
          qty_before: 5,
          qty_change: -2,
          qty_after: 3,
        }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      PAYMENT_EVENTS.CONFIRMED,
      expect.objectContaining({ orderId: 123, paymentId: 456 }),
      expect.objectContaining({ source: 'pos' }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      CASHFLOW_EVENTS.INCOME_RECORDED,
      expect.objectContaining({ orderId: 123, entryId: 789 }),
      expect.objectContaining({ source: 'pos' }),
    );
    expect(readModel.rebuildAll).toHaveBeenCalled();
  });

  it('writes non-cash sale to shift ledger without increasing cash drawer', async () => {
    const { service, tx } = makeHarness();

    await service.createSale(
      makeDto({
        clientSaleId: 'sale-2',
        payments: [{ method: 'QRIS', amount: 20000 }],
      }),
    );

    expect(tx.cashflow_entries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entry_type: CashflowEntryType.INCOME,
          amount: 20000,
          payment_method: 'QRIS',
          reference_id: '123',
          category: 'pos_sale',
        }),
      }),
    );
    // Non-cash: cash drawer must NOT increase
    expect(tx.cash_register_sessions.update).not.toHaveBeenCalled();
    expect(tx.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payment_method: 'QRIS',
          // paidAmount equals amount for non-cash
          paid_amount: 20000,
          status: PaymentStatus.PAID,
        }),
      }),
    );
  });

  it('returns cached receipt for duplicate clientSaleId without writing again', async () => {
    const cachedReceipt: PosSaleReceipt = {
      saleId: 'sale-dup',
      orderId: 999,
      receiptNumber: 'POS-10-999',
      registerSessionId: 10,
      cashierId: 'cashier-1',
      customerName: 'Walk-in',
      subtotal: 20000,
      discountAmount: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      total: 20000,
      paidTotal: 20000,
      change: 0,
      paymentMethods: ['Cash'],
      paymentLines: [{ method: 'Cash', amount: 20000, paidAmount: 20000 }],
      items: [
        {
          productId: 1,
          name: 'Nasi Goreng',
          qty: 2,
          unitPrice: 10000,
          lineTotal: 20000,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    const { service, prisma, tx } = makeHarness({ cachedReceipt });

    const receipt = await service.createSale(
      makeDto({ clientSaleId: 'sale-dup' }),
    );

    expect(receipt).toEqual(cachedReceipt);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.orders.create).not.toHaveBeenCalled();
  });

  it('rejects insufficient stock before order writes', async () => {
    const { service, tx } = makeHarness();
    tx.menu.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Nasi Goreng', price: 10000, stock: 1 },
    ]);

    await expect(service.createSale(makeDto())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.orders.create).not.toHaveBeenCalled();
    expect(tx.payments.create).not.toHaveBeenCalled();
  });

  it('allows non-stock-tracked service products without stock decrement', async () => {
    const { service, tx, sync } = makeHarness();
    tx.menu.findMany.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Jasa Konsultasi',
        price: 10000,
        stock: 0,
        is_stock_tracked: false,
      },
    ]);

    const receipt = await service.createSale(makeDto());

    expect(receipt.items[0]).toMatchObject({
      productId: 1,
      name: 'Jasa Konsultasi',
      qty: 2,
      lineTotal: 20000,
    });
    expect(tx.menu.update).not.toHaveBeenCalled();
    expect(tx.stock_change_logs.create).not.toHaveBeenCalled();
    expect(sync.writeOutboxInTx).not.toHaveBeenCalledWith(
      tx,
      STOCK_EVENTS.ADJUSTED,
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('reconstructs receipt by order id for reprint', async () => {
    const { service, prisma } = makeHarness();
    prisma.orders.findUnique.mockResolvedValueOnce({
      id: 123,
      name: 'Walk-in',
      payment_method: 'Cash',
      created_at: '2026-05-15T10:00:00.000Z',
      order_items: [{ menu_id: 1, name: 'Nasi Goreng', price: 10000, qty: 2 }],
      payments: [
        {
          amount: 20000,
          paid_amount: 25000,
          discount: 0,
          tax: 0,
          payment_method: 'Cash',
        },
      ],
    });
    prisma.cashflow_entries.findFirst.mockResolvedValueOnce({
      session_id: 10,
      operator_id: 'cashier-1',
    });
    prisma.audit_logs.findFirst.mockResolvedValueOnce({
      actor: 'cashier-1',
      correlation_id: 'sale-1',
      after_value: JSON.stringify({
        clientSaleId: 'sale-1',
        registerSessionId: 10,
        paymentMethods: ['Cash'],
        serviceChargeAmount: 1000,
      }),
    });

    const receipt = await service.getReceiptByOrderId(123);

    expect(receipt).toMatchObject({
      saleId: 'sale-1',
      orderId: 123,
      receiptNumber: 'POS-10-123',
      registerSessionId: 10,
      cashierId: 'cashier-1',
      subtotal: 20000,
      total: 20000,
      serviceChargeAmount: 1000,
      paidTotal: 25000,
      change: 5000,
      paymentMethods: ['Cash'],
    });
    expect(receipt.items).toEqual([
      {
        productId: 1,
        name: 'Nasi Goreng',
        qty: 2,
        unitPrice: 10000,
        lineTotal: 20000,
      },
    ]);
    expect(receipt.paymentLines).toEqual([
      {
        method: 'Cash',
        amount: 20000,
        paidAmount: 25000,
        reference: undefined,
      },
    ]);
  });

  // ── New Phase 4 tests ─────────────────────────────────────────────────────

  it('cash exact: paidAmount equals amount, change is zero', async () => {
    const { service } = makeHarness();

    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-cash-exact',
        payments: [{ method: 'Cash', amount: 20000, paidAmount: 20000 }],
      }),
    );

    expect(receipt.total).toBe(20000);
    expect(receipt.paidTotal).toBe(20000);
    expect(receipt.change).toBe(0);
  });

  it('cash with change: paidAmount > amount, change is correct', async () => {
    const { service } = makeHarness();

    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-cash-change',
        payments: [{ method: 'Cash', amount: 20000, paidAmount: 50000 }],
      }),
    );

    expect(receipt.total).toBe(20000);
    expect(receipt.paidTotal).toBe(50000);
    expect(receipt.change).toBe(30000);
  });

  it('QRIS non-cash: paidAmount equals amount, cash drawer not increased', async () => {
    const { service, tx } = makeHarness();

    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-qris',
        payments: [{ method: 'QRIS', amount: 20000 }],
      }),
    );

    expect(receipt.total).toBe(20000);
    expect(receipt.paidTotal).toBe(20000);
    expect(receipt.change).toBe(0);
    expect(receipt.paymentLines[0].paidAmount).toBe(20000);
    expect(tx.cash_register_sessions.update).not.toHaveBeenCalled();
  });

  it('split Cash + QRIS: cash drawer increases only by cash amount', async () => {
    const { service, tx } = makeHarness();
    // Product price 10000 × 2 = 20000 total
    // Split: 10000 cash + 10000 QRIS
    tx.menu.findMany.mockResolvedValueOnce([
      { id: 1, name: 'Nasi Goreng', price: 10000, stock: 5 },
    ]);

    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-split',
        payments: [
          { method: 'Cash', amount: 10000, paidAmount: 10000 },
          { method: 'QRIS', amount: 10000 },
        ],
      }),
    );

    expect(receipt.total).toBe(20000);
    expect(receipt.paymentMethods).toEqual(['Cash', 'QRIS']);
    expect(receipt.paymentLines).toHaveLength(2);
    // Cash drawer only increases by cash portion (10000), not QRIS
    expect(tx.cash_register_sessions.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { expected_cash: { increment: 10000 } },
    });
  });

  it('discount reduces total correctly', async () => {
    const { service } = makeHarness();
    // subtotal = 20000, discount = 5000, total = 15000
    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-discount',
        discountAmount: 5000,
        discountReason: 'Member promo',
        payments: [{ method: 'Cash', amount: 15000, paidAmount: 15000 }],
      }),
    );

    expect(receipt.subtotal).toBe(20000);
    expect(receipt.discountAmount).toBe(5000);
    expect(receipt.total).toBe(15000);
    expect(receipt.change).toBe(0);
  });

  it('tax and service charge increase total correctly', async () => {
    const { service, tx } = makeHarness();
    // subtotal = 20000, tax = 2000, sc = 1000, total = 23000
    const receipt = await service.createSale(
      makeDto({
        clientSaleId: 'sale-tax-sc',
        taxAmount: 2000,
        serviceChargeAmount: 1000,
        payments: [{ method: 'Cash', amount: 23000, paidAmount: 23000 }],
      }),
    );

    expect(receipt.subtotal).toBe(20000);
    expect(receipt.taxAmount).toBe(2000);
    expect(receipt.serviceChargeAmount).toBe(1000);
    expect(receipt.total).toBe(23000);
    expect(tx.pos_sales.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tax_amount: 2000,
          service_charge_amount: 1000,
          total: 23000,
        }),
      }),
    );
  });

  it('issues unique receipt numbers from the store/register/date sequence', async () => {
    const { service, tx } = makeHarness();
    tx.receipt_sequences.upsert
      .mockResolvedValueOnce({ sequence: 1 })
      .mockResolvedValueOnce({ sequence: 2 });

    const first = await service.createSale(makeDto({ clientSaleId: 'sale-a' }));
    const second = await service.createSale(
      makeDto({ clientSaleId: 'sale-b' }),
    );

    expect(first.receiptNumber).not.toBe(second.receiptNumber);
    expect(first.receiptNumber).toMatch(/-0001$/);
    expect(second.receiptNumber).toMatch(/-0002$/);
  });

  it('reads immutable sale receipt before reconstructing historical receipt', async () => {
    const { service, prisma } = makeHarness();
    prisma.pos_sales.findUnique.mockResolvedValueOnce({
      id: 321,
      client_sale_id: 'sale-persisted',
      order_id: 123,
      receipt_number: 'R-STORE1-20260515-10-0007',
      register_session_id: 10,
      cashier_id: 'cashier-1',
      store_id: 'store-1',
      customer_name: 'Walk-in',
      customer_phone: '',
      order_type: 'pickup',
      status: PosSaleStatus.PAID,
      subtotal: 20000,
      discount_amount: 0,
      discount_reason: null,
      tax_amount: 0,
      tax_mode: 'exclusive',
      service_charge_amount: 1000,
      total: 21000,
      paid_total: 25000,
      change_amount: 4000,
      payment_methods: JSON.stringify(['Cash']),
      payment_lines: JSON.stringify([
        { method: 'Cash', amount: 21000, paidAmount: 25000 },
      ]),
      created_at: '2026-05-15T10:00:00.000Z',
      pos_sale_items: [
        {
          product_id: 1,
          name: 'Nasi Goreng',
          qty: 2,
          unit_price: 10000,
          line_total: 20000,
        },
      ],
    });

    const receipt = await service.getReceiptByOrderId(123);

    expect(receipt).toMatchObject({
      saleId: 'sale-persisted',
      receiptNumber: 'R-STORE1-20260515-10-0007',
      serviceChargeAmount: 1000,
      total: 21000,
      paidTotal: 25000,
      change: 4000,
    });
    expect(prisma.orders.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when payment sum does not equal total', async () => {
    const { service } = makeHarness();

    await expect(
      service.createSale(
        makeDto({
          clientSaleId: 'sale-mismatch',
          // total = 20000 but payment = 15000
          payments: [{ method: 'Cash', amount: 15000, paidAmount: 15000 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when discount exceeds subtotal', async () => {
    const { service } = makeHarness();
    // subtotal = 20000, discount = 25000 → invalid
    await expect(
      service.createSale(
        makeDto({
          clientSaleId: 'sale-bad-discount',
          discountAmount: 25000,
          discountReason: 'Too much',
          payments: [{ method: 'Cash', amount: 0, paidAmount: 0 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when cash paidAmount is less than cash amount', async () => {
    const { service } = makeHarness();

    await expect(
      service.createSale(
        makeDto({
          clientSaleId: 'sale-underpaid',
          payments: [{ method: 'Cash', amount: 20000, paidAmount: 10000 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
