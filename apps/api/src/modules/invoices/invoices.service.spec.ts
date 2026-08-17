// apps/api/src/modules/invoices/invoices.service.spec.ts
//
// Smoke tests for InvoicesService — previously zero coverage (FIN-01).

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

function makeHarness() {
  const invoices = new Map<number, any>();
  const sequences = new Map<string, number>();
  let invoiceIdSeq = 1;

  const prisma = {
    invoices: {
      create: jest.fn(async ({ data }: any) => {
        const { lines, ...rest } = data;
        const row = {
          id: invoiceIdSeq++,
          ...rest,
          lines: (lines?.create ?? []).map((l: any, i: number) => ({
            id: i + 1,
            ...l,
          })),
        };
        invoices.set(row.id, row);
        return row;
      }),
      findUnique: jest.fn(async ({ where }: any) => invoices.get(where.id) ?? null),
      findMany: jest.fn(async ({ where, take = 20, skip = 0 }: any) => {
        let rows = [...invoices.values()].filter(
          (i) => i.store_id === where.store_id,
        );
        if (where.status) rows = rows.filter((i) => i.status === where.status);
        return rows.slice(skip, skip + take);
      }),
      count: jest.fn(async ({ where }: any) => {
        let rows = [...invoices.values()].filter(
          (i) => i.store_id === where.store_id,
        );
        if (where.status) rows = rows.filter((i) => i.status === where.status);
        return rows.length;
      }),
      aggregate: jest.fn(async ({ where }: any) => {
        let rows = [...invoices.values()].filter(
          (i) => i.store_id === where.store_id,
        );
        if (where.status) rows = rows.filter((i) => i.status === where.status);
        return {
          _count: rows.length,
          _sum: { total: rows.reduce((s, r) => s + r.total, 0) || null },
        };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = invoices.get(where.id);
        Object.assign(row, data);
        return row;
      }),
    },
    invoice_sequences: {
      upsert: jest.fn(async ({ where }: any) => {
        const key = `${where.store_id_business_date.store_id}:${where.store_id_business_date.business_date}`;
        const next = (sequences.get(key) ?? 0) + 1;
        sequences.set(key, next);
        return { sequence: next };
      }),
    },
  };

  const service = new InvoicesService(prisma as any);
  return { service, prisma, invoices };
}

const baseDto = () => ({
  customerName: 'Toko Jaya',
  issueDate: '2026-08-12',
  lines: [
    { description: 'Kopi Arabica 1kg', qty: 2, unitPrice: 150000 },
    { description: 'Gula Aren 500g', qty: 3, unitPrice: 20000 },
  ],
});

describe('InvoicesService', () => {
  describe('createInvoice', () => {
    it('computes subtotal and total from lines', async () => {
      const { service } = makeHarness();
      const invoice = await service.createInvoice(baseDto() as any, 'owner-1');
      // subtotal = 2*150000 + 3*20000 = 360000
      expect(invoice.subtotal).toBe(360000);
      expect(invoice.total).toBe(360000);
      expect(invoice.status).toBe('draft');
      expect(invoice.lines).toHaveLength(2);
    });

    it('applies discount and tax to the total', async () => {
      const { service } = makeHarness();
      const invoice = await service.createInvoice(
        { ...baseDto(), discount: 10000, tax: 5000 } as any,
        'owner-1',
      );
      expect(invoice.total).toBe(360000 - 10000 + 5000);
    });

    it('generates a sequential invoice number per store per day', async () => {
      const { service } = makeHarness();
      const first = await service.createInvoice(baseDto() as any, 'owner-1');
      const second = await service.createInvoice(baseDto() as any, 'owner-1');
      expect(first.invoiceNumber).not.toBe(second.invoiceNumber);
      expect(first.invoiceNumber).toMatch(/-0001$/);
      expect(second.invoiceNumber).toMatch(/-0002$/);
    });

    it('derives dueDate from net payment terms when not given explicitly', async () => {
      const { service } = makeHarness();
      const invoice = await service.createInvoice(
        { ...baseDto(), paymentTerms: 'net_14' } as any,
        'owner-1',
      );
      expect(invoice.dueDate).toBe('2026-08-26');
    });
  });

  describe('updateStatus', () => {
    it('transitions draft to issued', async () => {
      const { service } = makeHarness();
      const invoice = await service.createInvoice(baseDto() as any, 'owner-1');
      const updated = await service.updateStatus(
        invoice.id,
        { status: 'issued' } as any,
        'owner-1',
      );
      expect(updated.status).toBe('issued');
    });

    it('rejects updating an already-paid (terminal) invoice', async () => {
      const { service } = makeHarness();
      const invoice = await service.createInvoice(baseDto() as any, 'owner-1');
      await service.updateStatus(invoice.id, { status: 'issued' } as any, 'x');
      await service.updateStatus(invoice.id, { status: 'paid' } as any, 'x');

      await expect(
        service.updateStatus(invoice.id, { status: 'cancelled' } as any, 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for an unknown invoice', async () => {
      const { service } = makeHarness();
      await expect(
        service.updateStatus(999, { status: 'issued' } as any, 'x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getSummary', () => {
    it('aggregates counts and totals by status', async () => {
      const { service } = makeHarness();
      const a = await service.createInvoice(baseDto() as any, 'owner-1');
      await service.createInvoice(baseDto() as any, 'owner-1');
      await service.updateStatus(a.id, { status: 'issued' } as any, 'x');

      const summary = await service.getSummary('default-store');
      expect(summary.total).toBe(2);
      expect(summary.draft).toBe(1);
      expect(summary.issued).toBe(1);
      expect(summary.issuedAmount).toBe(360000);
    });
  });
});
