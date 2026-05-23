// apps/api/src/modules/invoices/invoices.service.ts
//
// InvoicesService — Sales Invoice (Faktur Penjualan) management.
//
// Invoice lifecycle:
//   draft → issued → paid      (normal B2B credit flow)
//   issued → overdue            (auto-detectable via due_date)
//   any non-terminal → cancelled
//
// Invoice number format: INV-{YYYYMMDD}-{STORE_SHORT}-{SEQ:04d}
// e.g. INV-20260523-DEF-0001

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './invoices.dto';

const TERMINAL_STATUSES = ['paid', 'cancelled'];

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create invoice ────────────────────────────────────────────────────────

  async createInvoice(dto: CreateInvoiceDto, createdBy: string) {
    const storeId = dto.storeId ?? 'default-store';
    const invoiceNumber = await this.nextInvoiceNumber(storeId);

    const subtotal = dto.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    // Compute due date from payment terms if not provided
    let dueDate = dto.dueDate ?? null;
    if (!dueDate && dto.paymentTerms && dto.paymentTerms !== 'cod') {
      const days = parseInt(dto.paymentTerms.replace('net_', ''), 10);
      const d = new Date(dto.issueDate);
      d.setDate(d.getDate() + days);
      dueDate = d.toISOString().slice(0, 10);
    }

    const invoice = await this.prisma.invoices.create({
      data: {
        invoice_number: invoiceNumber,
        store_id: storeId,
        order_id: dto.orderId ?? null,
        customer_name: dto.customerName,
        customer_phone: dto.customerPhone ?? null,
        customer_email: dto.customerEmail ?? null,
        customer_address: dto.customerAddress ?? null,
        status: 'draft',
        payment_terms: dto.paymentTerms ?? 'cod',
        issue_date: dto.issueDate,
        due_date: dueDate,
        subtotal,
        discount,
        tax,
        total,
        notes: dto.notes ?? null,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        lines: {
          create: dto.lines.map((l) => ({
            description: l.description,
            qty: l.qty,
            unit_price: l.unitPrice,
            total: l.unitPrice * l.qty,
          })),
        },
      },
      include: { lines: true },
    });

    return this.toResponse(invoice);
  }

  // ─── List invoices ─────────────────────────────────────────────────────────

  async listInvoices(params: {
    storeId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const storeId = params.storeId ?? 'default-store';
    const limit = Math.min(params.limit ?? 20, 100);
    const offset = params.offset ?? 0;

    const where: any = { store_id: storeId };
    if (params.status) where.status = params.status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoices.findMany({
        where,
        include: { lines: true },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.invoices.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.toResponse(inv)),
      total,
      limit,
      offset,
    };
  }

  // ─── Get single invoice ────────────────────────────────────────────────────

  async getInvoice(id: number) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice #${id} tidak ditemukan`);
    return this.toResponse(invoice);
  }

  // ─── Update status ─────────────────────────────────────────────────────────

  async updateStatus(id: number, dto: UpdateInvoiceStatusDto, actor: string) {
    const invoice = await this.prisma.invoices.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Invoice #${id} tidak ditemukan`);
    if (TERMINAL_STATUSES.includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice sudah dalam status final (${invoice.status})`,
      );
    }

    const now = new Date().toISOString();
    const data: any = {
      status: dto.status,
      updated_at: now,
    };

    if (dto.status === 'paid') {
      data.paid_date = dto.paidDate ?? now.slice(0, 10);
    }
    if (dto.notes) {
      data.notes = invoice.notes ? `${invoice.notes}\n${dto.notes}` : dto.notes;
    }

    const updated = await this.prisma.invoices.update({
      where: { id },
      data,
      include: { lines: true },
    });

    return this.toResponse(updated);
  }

  // ─── Summary stats ─────────────────────────────────────────────────────────

  async getSummary(storeId?: string) {
    const sid = storeId ?? 'default-store';
    const [all, draft, issued, paid, overdue, cancelled] = await Promise.all([
      this.prisma.invoices.aggregate({ where: { store_id: sid }, _count: true, _sum: { total: true } }),
      this.prisma.invoices.count({ where: { store_id: sid, status: 'draft' } }),
      this.prisma.invoices.aggregate({ where: { store_id: sid, status: 'issued' }, _count: true, _sum: { total: true } }),
      this.prisma.invoices.aggregate({ where: { store_id: sid, status: 'paid' }, _count: true, _sum: { total: true } }),
      this.prisma.invoices.count({ where: { store_id: sid, status: 'overdue' } }),
      this.prisma.invoices.count({ where: { store_id: sid, status: 'cancelled' } }),
    ]);

    return {
      total: all._count,
      totalAmount: all._sum.total ?? 0,
      draft,
      issued: issued._count,
      issuedAmount: issued._sum.total ?? 0,
      paid: paid._count,
      paidAmount: paid._sum.total ?? 0,
      overdue,
      cancelled,
    };
  }

  // ─── Invoice number generation ─────────────────────────────────────────────

  private async nextInvoiceNumber(storeId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const storeShort = storeId
      .replace('default-store', 'DEF')
      .toUpperCase()
      .slice(0, 3);

    const seq = await this.prisma.invoice_sequences.upsert({
      where: { store_id_business_date: { store_id: storeId, business_date: today } },
      create: { store_id: storeId, business_date: today, sequence: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      update: { sequence: { increment: 1 }, updated_at: new Date().toISOString() },
    });

    return `INV-${today}-${storeShort}-${String(seq.sequence).padStart(4, '0')}`;
  }

  // ─── Response mapper ───────────────────────────────────────────────────────

  private toResponse(inv: any) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      storeId: inv.store_id,
      orderId: inv.order_id,
      customerName: inv.customer_name,
      customerPhone: inv.customer_phone,
      customerEmail: inv.customer_email,
      customerAddress: inv.customer_address,
      status: inv.status,
      paymentTerms: inv.payment_terms,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      paidDate: inv.paid_date,
      subtotal: inv.subtotal,
      discount: inv.discount,
      tax: inv.tax,
      total: inv.total,
      notes: inv.notes,
      createdBy: inv.created_by,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      lines: (inv.lines ?? []).map((l: any) => ({
        id: l.id,
        description: l.description,
        qty: l.qty,
        unitPrice: l.unit_price,
        total: l.total,
      })),
    };
  }
}
