// apps/api/src/modules/fnb/kitchen.service.ts
//
// KitchenService — manage kitchen tickets and KDS (Kitchen Display System).
//
// Design rules:
//   • One ticket per order (createTicketForOrder is idempotent by order_id).
//   • Ticket items mirror order_items at creation time.
//   • Status transitions: pending → preparing → ready → served | cancelled.
//   • Individual items can be marked ready/cancelled independently.
//   • Ticket auto-advances to "ready" when all items are ready.
//   • Does NOT block the POS sale transaction — called after sale commits.

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  KitchenTicketStatus,
  KitchenTicketStatusValue,
  KitchenItemStatus,
  KitchenItemStatusValue,
  KitchenTicketPriorityValue,
} from './fnb.types';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateTicketDto {
  orderId: number;
  tableId?: number | null;
  priority?: KitchenTicketPriorityValue;
  notes?: string;
  storeId?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Ticket number generation ───────────────────────────────────────────────

  private async nextTicketNumber(storeId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const storeShort = storeId.slice(0, 3).toUpperCase();
    const count = await this.prisma.kitchen_tickets.count({
      where: {
        store_id: storeId,
        created_at: {
          gte: `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`,
        },
      },
    });
    return `KT-${today}-${storeShort}-${String(count + 1).padStart(4, '0')}`;
  }

  // ── Create ticket for an order ─────────────────────────────────────────────

  async createTicketForOrder(dto: CreateTicketDto) {
    const storeId = dto.storeId ?? 'default-store';

    // Idempotency: if ticket already exists for this order, return it
    const existing = await this.prisma.kitchen_tickets.findFirst({
      where: { order_id: dto.orderId, store_id: storeId },
      include: { items: true },
    });
    if (existing) return existing;

    // Load order with items
    const order = await this.prisma.orders.findUnique({
      where: { id: dto.orderId },
      include: { order_items: true },
    });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);

    const ticketNumber = await this.nextTicketNumber(storeId);
    const now = new Date().toISOString();

    return this.prisma.kitchen_tickets.create({
      data: {
        store_id: storeId,
        order_id: dto.orderId,
        table_id: dto.tableId ?? null,
        ticket_number: ticketNumber,
        status: KitchenTicketStatus.PENDING,
        priority: dto.priority ?? 'normal',
        notes: dto.notes ?? null,
        updated_at: now,
        items: {
          create: order.order_items.map((item) => ({
            menu_id: item.menu_id,
            name: item.name,
            qty: item.qty,
            status: KitchenItemStatus.PENDING,
            updated_at: now,
          })),
        },
      },
      include: { items: true, table: { include: { area: true } } },
    });
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async getActiveTickets(storeId = 'default-store') {
    return this.prisma.kitchen_tickets.findMany({
      where: {
        store_id: storeId,
        status: {
          in: [KitchenTicketStatus.PENDING, KitchenTicketStatus.PREPARING],
        },
      },
      include: { items: true, table: { include: { area: true } } },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
    });
  }

  async getTicketsByStatus(storeId: string, status: KitchenTicketStatusValue) {
    return this.prisma.kitchen_tickets.findMany({
      where: { store_id: storeId, status },
      include: { items: true, table: { include: { area: true } } },
      orderBy: { created_at: 'asc' },
    });
  }

  async getTicketById(id: number) {
    return this.prisma.kitchen_tickets.findUnique({
      where: { id },
      include: { items: true, table: { include: { area: true } } },
    });
  }

  async getTicketByOrderId(orderId: number) {
    return this.prisma.kitchen_tickets.findFirst({
      where: { order_id: orderId },
      include: { items: true, table: { include: { area: true } } },
    });
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async updateTicketStatus(id: number, status: KitchenTicketStatusValue) {
    const ticket = await this.prisma.kitchen_tickets.findUnique({
      where: { id },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);

    const now = new Date().toISOString();
    const data: Record<string, any> = { status, updated_at: now };
    if (status === KitchenTicketStatus.READY) data.ready_at = now;
    if (status === KitchenTicketStatus.SERVED) data.served_at = now;

    return this.prisma.kitchen_tickets.update({
      where: { id },
      data,
      include: { items: true, table: { include: { area: true } } },
    });
  }

  async updateItemStatus(itemId: number, status: KitchenItemStatusValue) {
    const item = await this.prisma.kitchen_ticket_items.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException(`Ticket item ${itemId} not found`);

    const now = new Date().toISOString();
    await this.prisma.kitchen_ticket_items.update({
      where: { id: itemId },
      data: { status, updated_at: now },
    });

    // Auto-advance ticket to "ready" if all non-cancelled items are ready
    const allItems = await this.prisma.kitchen_ticket_items.findMany({
      where: { ticket_id: item.ticket_id },
    });
    const activeItems = allItems.filter(
      (i) => i.status !== KitchenItemStatus.CANCELLED,
    );
    const allReady =
      activeItems.length > 0 &&
      activeItems.every((i) => i.status === KitchenItemStatus.READY);

    if (allReady) {
      await this.prisma.kitchen_tickets.update({
        where: { id: item.ticket_id },
        data: {
          status: KitchenTicketStatus.READY,
          ready_at: now,
          updated_at: now,
        },
      });
    }

    return this.prisma.kitchen_tickets.findUnique({
      where: { id: item.ticket_id },
      include: { items: true, table: { include: { area: true } } },
    });
  }
}
