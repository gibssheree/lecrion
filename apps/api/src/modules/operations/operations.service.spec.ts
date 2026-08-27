// apps/api/src/modules/operations/operations.service.spec.ts
//
// Tests for the operational documents lifecycle.
// Uses string literals for document types and statuses to avoid ts-jest
// module initialization order issues with @libs/contracts path aliases.

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@libs/contracts/src/enums';
import {
  OPERATION_DOCUMENT_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { OperationsService } from './operations.service';

// ── String constants (mirrors enum values) ────────────────────────────────────
const DOC_TYPE = {
  PURCHASE_ORDER: 'purchase_order',
  GOODS_RECEIPT: 'goods_receipt',
  STOCK_TRANSFER: 'stock_transfer',
  STOCK_ADJUSTMENT: 'stock_adjustment',
} as const;

const DOC_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  POSTED: 'posted',
  CANCELLED: 'cancelled',
} as const;

// ── Harness ───────────────────────────────────────────────────────────────────

function makeDoc(
  overrides: Partial<{
    id: number;
    document_number: string;
    document_type: string;
    status: string;
    store_id: string;
    source_location_id: number | null;
    destination_location_id: number | null;
    notes: string | null;
  }> = {},
) {
  return {
    id: 1,
    document_number: 'GR-20260515-DEF-0001',
    document_type: DOC_TYPE.GOODS_RECEIPT,
    status: DOC_STATUS.DRAFT,
    store_id: 'default-store',
    source_location_id: null,
    destination_location_id: 2,
    supplier_id: null,
    supplier_name: 'Supplier A',
    linked_document_id: null,
    created_by: 'manager-1',
    submitted_by: null,
    posted_by: null,
    cancelled_by: null,
    notes: null,
    created_at: '2026-05-15T10:00:00.000Z',
    submitted_at: null,
    posted_at: null,
    cancelled_at: null,
    ...overrides,
  };
}

function makeLines() {
  return [
    {
      id: 10,
      document_id: 1,
      menu_id: 1,
      qty: 5,
      unit_cost: 8000,
      metadata: null,
      created_at: '2026-05-15T10:00:00.000Z',
      menu: { id: 1, name: 'Nasi Goreng' },
    },
  ];
}

function makeHarness(
  doc: ReturnType<typeof makeDoc> | null = makeDoc(),
  lines: ReturnType<typeof makeLines> = makeLines(),
  options: { tier?: string } = {},
) {
  const tx = {
    operation_documents: {
      create: jest.fn().mockResolvedValue(doc ?? makeDoc()),
      update: jest.fn().mockResolvedValue({}),
    },
    operation_document_lines: {
      create: jest.fn().mockResolvedValue({}),
    },
    sync_outbox: { create: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    operation_documents: {
      findUnique: jest.fn().mockResolvedValue(doc ? { ...doc, lines } : null),
      findMany: jest.fn().mockResolvedValue(doc ? [{ ...doc, lines }] : []),
      count: jest.fn().mockResolvedValue(doc ? 1 : 0),
    },
    operation_document_lines: {
      findMany: jest.fn().mockResolvedValue(lines),
    },
    operation_document_sequences: {
      findFirst: jest.fn().mockResolvedValue({ sequence: 1 }),
    },
    menu: {
      findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Nasi Goreng' }]),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };

  const audit = { record: jest.fn() };
  const sync = { writeOutboxInTx: jest.fn().mockResolvedValue(undefined) };
  const ledger = {
    writeMovement: jest.fn().mockResolvedValue({
      id: 100,
      menuId: 1,
      changeType: 'restock',
      qtyBefore: 10,
      qtyChange: 5,
      qtyAfter: 15,
      note: null,
      storeId: 'default-store',
      operatorId: 'manager-1',
      sourceRef: 'GR-20260515-DEF-0001',
      orderId: null,
      adminId: null,
      createdAt: '2026-05-15T10:00:00.000Z',
    }),
  };

  // Defaults to 'enterprise' so existing purchase_order/goods_receipt tests
  // (which predate tier-gating and expect success) keep passing — only
  // tests that explicitly want the gate pass options.tier.
  const stores = { getStoreTier: jest.fn().mockResolvedValue(options.tier ?? 'enterprise') };

  const service = new OperationsService(
    prisma as any,
    audit as any,
    sync as any,
    ledger as any,
    stores as any,
  );

  return { service, prisma, tx, audit, sync, ledger, stores };
}

// ── Create tests ──────────────────────────────────────────────────────────────

describe('OperationsService.createDocument', () => {
  it('creates a goods_receipt document in DRAFT status', async () => {
    const { service, tx, sync, audit } = makeHarness();

    const result = await service.createDocument(
      {
        documentType: DOC_TYPE.GOODS_RECEIPT,
        destinationLocationId: 2,
        supplierName: 'Supplier A',
        lines: [{ menuId: 1, qty: 5, unitCost: 8000 }],
      },
      { actor: 'manager-1' } as any,
    );

    expect(tx.operation_documents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          document_type: DOC_TYPE.GOODS_RECEIPT,
          status: DOC_STATUS.DRAFT,
          destination_location_id: 2,
          created_by: 'manager-1',
        }),
      }),
    );
    expect(tx.operation_document_lines.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ menu_id: 1, qty: 5, unit_cost: 8000 }),
      }),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      'operation_document.created',
      expect.objectContaining({ documentType: DOC_TYPE.GOODS_RECEIPT }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'operation_document.created' }),
    );
    expect(result.status).toBe(DOC_STATUS.DRAFT);
  });

  it('rejects goods_receipt creation on non-Enterprise tier', async () => {
    const { service, stores } = makeHarness(makeDoc(), makeLines(), { tier: 'business' });

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.GOODS_RECEIPT,
          destinationLocationId: 2,
          lines: [{ menuId: 1, qty: 5, unitCost: 8000 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(stores.getStoreTier).toHaveBeenCalled();
  });

  it('rejects purchase_order creation on Starter tier', async () => {
    const { service } = makeHarness(makeDoc(), makeLines(), { tier: 'starter' });

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.PURCHASE_ORDER,
          supplierName: 'Supplier A',
          lines: [{ menuId: 1, qty: 5, unitCost: 8000 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows stock_transfer creation on Starter tier (not gated — Business relies on this for multi-location)', async () => {
    const { service } = makeHarness(makeDoc(), makeLines(), { tier: 'starter' });

    const result = await service.createDocument(
      {
        documentType: DOC_TYPE.STOCK_TRANSFER,
        sourceLocationId: 1,
        destinationLocationId: 2,
        lines: [{ menuId: 1, qty: 5 }],
      },
      { actor: 'manager-1' } as any,
    );
    expect(result.status).toBe(DOC_STATUS.DRAFT);
  });

  it('allows stock_adjustment creation on Starter tier (not gated)', async () => {
    const { service } = makeHarness(makeDoc(), makeLines(), { tier: 'starter' });

    const result = await service.createDocument(
      {
        documentType: DOC_TYPE.STOCK_ADJUSTMENT,
        destinationLocationId: 2,
        lines: [{ menuId: 1, qty: -2 }],
      },
      { actor: 'manager-1' } as any,
    );
    expect(result.status).toBe(DOC_STATUS.DRAFT);
  });

  it('rejects goods_receipt without destinationLocationId', async () => {
    const { service } = makeHarness();

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.GOODS_RECEIPT,
          lines: [{ menuId: 1, qty: 5 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects stock_transfer without sourceLocationId', async () => {
    const { service } = makeHarness();

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.STOCK_TRANSFER,
          destinationLocationId: 2,
          lines: [{ menuId: 1, qty: 3 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects stock_transfer with same source and destination', async () => {
    const { service } = makeHarness();

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.STOCK_TRANSFER,
          sourceLocationId: 2,
          destinationLocationId: 2,
          lines: [{ menuId: 1, qty: 3 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when product does not exist', async () => {
    const { service, prisma } = makeHarness();
    prisma.menu.findMany.mockResolvedValueOnce([]);

    await expect(
      service.createDocument(
        {
          documentType: DOC_TYPE.GOODS_RECEIPT,
          destinationLocationId: 2,
          lines: [{ menuId: 999, qty: 5 }],
        },
        { actor: 'manager-1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── Submit tests ──────────────────────────────────────────────────────────────

describe('OperationsService.submitDocument', () => {
  it('submits a DRAFT document', async () => {
    const { service, tx, sync, audit } = makeHarness();

    await service.submitDocument(1, { operatorId: 'manager-1' }, undefined);

    expect(tx.operation_documents.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: DOC_STATUS.SUBMITTED,
        submitted_by: 'manager-1',
      }),
    });
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      'operation_document.submitted',
      expect.objectContaining({ documentId: 1 }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'operation_document.submitted' }),
    );
  });

  it('rejects submit of already submitted document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.SUBMITTED }));

    await expect(
      service.submitDocument(1, {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects submit of posted document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.POSTED }));

    await expect(
      service.submitDocument(1, {}, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for unknown document', async () => {
    const { service } = makeHarness(null);

    await expect(
      service.submitDocument(999, {}, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects submitting another store\'s document (cross-tenant guard)', async () => {
    const { service } = makeHarness(makeDoc({ store_id: 'default-store' }));

    await expect(
      service.submitDocument(1, {}, { storeId: 'store-someone-else', actor: 'u1' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows submitting when the authenticated user matches the document\'s store', async () => {
    const { service } = makeHarness(makeDoc({ store_id: 'default-store' }));

    await expect(
      service.submitDocument(1, {}, { storeId: 'default-store', actor: 'u1' } as any),
    ).resolves.toBeDefined();
  });
});

// ── Post tests ────────────────────────────────────────────────────────────────

describe('OperationsService.postDocument', () => {
  it('posts a goods_receipt and creates RESTOCK movement', async () => {
    const submittedDoc = makeDoc({ status: DOC_STATUS.SUBMITTED });
    const { service, tx, sync, audit, ledger } = makeHarness(submittedDoc);

    const result = await service.postDocument(
      1,
      { operatorId: 'manager-1' },
      undefined,
    );

    expect(tx.operation_documents.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: DOC_STATUS.POSTED,
        posted_by: 'manager-1',
      }),
    });
    expect(ledger.writeMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        menuId: 1,
        qtyChange: 5,
        movementType: 'restock',
        sourceRef: 'GR-20260515-DEF-0001',
      }),
      expect.anything(),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      'operation_document.posted',
      expect.objectContaining({ documentId: 1, movementCount: 1 }),
      expect.any(Object),
    );
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      'stock.adjusted',
      expect.objectContaining({ productId: 1, qtyChange: 5 }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'operation_document.posted' }),
    );
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0]).toMatchObject({
      menuId: 1,
      movementType: 'restock',
      qtyChange: 5,
    });
  });

  it('posts a purchase_order without creating stock movements', async () => {
    const poDoc = makeDoc({
      document_type: DOC_TYPE.PURCHASE_ORDER,
      status: DOC_STATUS.SUBMITTED,
      destination_location_id: null,
    });
    const { service, ledger } = makeHarness(poDoc);

    const result = await service.postDocument(1, {}, undefined);

    expect(ledger.writeMovement).not.toHaveBeenCalled();
    expect(result.movements).toHaveLength(0);
  });

  it('posts a stock_transfer and creates TRANSFER_OUT + TRANSFER_IN movements', async () => {
    const transferDoc = makeDoc({
      document_type: DOC_TYPE.STOCK_TRANSFER,
      status: DOC_STATUS.SUBMITTED,
      source_location_id: 1,
      destination_location_id: 2,
    });
    const { service, ledger } = makeHarness(transferDoc);

    const result = await service.postDocument(1, {}, undefined);

    expect(ledger.writeMovement).toHaveBeenCalledTimes(2);
    expect(ledger.writeMovement).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        qtyChange: -5,
        movementType: 'transfer',
      }),
      expect.anything(),
    );
    expect(ledger.writeMovement).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        qtyChange: 5,
        movementType: 'transfer',
      }),
      expect.anything(),
    );
    expect(result.movements).toHaveLength(2);
  });

  it('posts a stock_adjustment and creates ADJUSTMENT movement', async () => {
    const adjDoc = makeDoc({
      document_type: DOC_TYPE.STOCK_ADJUSTMENT,
      status: DOC_STATUS.SUBMITTED,
      destination_location_id: 2,
    });
    const { service, ledger } = makeHarness(adjDoc);

    await service.postDocument(1, {}, undefined);

    expect(ledger.writeMovement).toHaveBeenCalledWith(
      expect.objectContaining({ movementType: 'adjustment' }),
      expect.anything(),
    );
  });

  it('rejects posting an already posted document (idempotency guard)', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.POSTED }));

    await expect(service.postDocument(1, {}, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects posting a cancelled document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.CANCELLED }));

    await expect(service.postDocument(1, {}, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects posting a DRAFT document (must submit first)', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.DRAFT }));

    await expect(service.postDocument(1, {}, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// ── Cancel tests ──────────────────────────────────────────────────────────────

describe('OperationsService.cancelDocument', () => {
  it('cancels a DRAFT document', async () => {
    const { service, tx, sync, audit } = makeHarness();

    await service.cancelDocument(
      1,
      { reason: 'wrong supplier', operatorId: 'manager-1' },
      undefined,
    );

    expect(tx.operation_documents.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: DOC_STATUS.CANCELLED,
        cancelled_by: 'manager-1',
      }),
    });
    expect(sync.writeOutboxInTx).toHaveBeenCalledWith(
      tx,
      'operation_document.cancelled',
      expect.objectContaining({ reason: 'wrong supplier' }),
      expect.any(Object),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'operation_document.cancelled' }),
    );
  });

  it('cancels a SUBMITTED document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.SUBMITTED }));

    await expect(
      service.cancelDocument(1, { reason: 'cancelled by manager' }, undefined),
    ).resolves.toBeDefined();
  });

  it('rejects cancellation of a POSTED document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.POSTED }));

    await expect(
      service.cancelDocument(1, { reason: 'test' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancellation of already cancelled document', async () => {
    const { service } = makeHarness(makeDoc({ status: DOC_STATUS.CANCELLED }));

    await expect(
      service.cancelDocument(1, { reason: 'test' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cancellation when reason is empty', async () => {
    const { service } = makeHarness();

    await expect(
      service.cancelDocument(1, { reason: '   ' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFoundException for unknown document', async () => {
    const { service } = makeHarness(null);

    await expect(
      service.cancelDocument(999, { reason: 'test' }, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

