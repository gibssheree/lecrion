import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import {
  OrderStatus,
  OrderStatusValue,
  ORDER_STATUS_VALUES,
} from '@libs/contracts/src/enums';
import { ORDER_EVENTS } from '@libs/contracts/src/events';

// Re-export so the controller can import from one place
export { OrderStatusValue };

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * List orders with optional status filter.
   * Includes computed total from order_items.
   */
  async listOrders(statusFilter = 'all', limit = 50) {
    const safeLimit = Math.min(Number(limit) || 50, 200);

    const orders = await this.prisma.orders.findMany({
      where: statusFilter !== 'all' ? { status: statusFilter } : undefined,
      orderBy: { created_at: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        user_id: true,
        type: true,
        name: true,
        phone: true,
        address: true,
        delivery_cost: true,
        payment_method: true,
        status: true,
        created_at: true,
        estimated_time: true,
        order_items: {
          select: { price: true, qty: true },
        },
      },
    });

    // Compute total from items (no total column in schema)
    return orders.map((o) => ({
      ...o,
      total: o.order_items.reduce(
        (sum, i) => sum + Number(i.price) * Number(i.qty),
        0,
      ),
      order_items: undefined, // don't expose raw items in list
    }));
  }

  /**
   * Get a single order with its items.
   */
  async getOrderById(id: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      include: { order_items: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  /**
   * Update order status with audit trail and realtime event.
   * Domain write + outbox write are in one transaction.
   */
  async updateOrderStatus(
    id: number,
    newStatus: OrderStatusValue,
    operatorId = 'system',
  ): Promise<boolean> {
    if (!ORDER_STATUS_VALUES.includes(newStatus)) {
      throw new Error(
        `Invalid order status: "${newStatus}". Valid values: ${ORDER_STATUS_VALUES.join(', ')}`,
      );
    }

    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    const oldStatus = order.status;
    if (oldStatus === newStatus) return true;

    await this.prisma.$transaction(async (tx) => {
      await tx.orders.update({
        where: { id },
        data: { status: newStatus },
      });

      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.STATUS_CHANGED,
        { orderId: id, oldStatus, newStatus },
        { source: 'orders' },
      );
    });

    // Non-critical post-commit side effects
    this.audit.record({
      actor: operatorId,
      action: ORDER_EVENTS.STATUS_CHANGED,
      resource: 'orders',
      resourceId: id,
      before: { status: oldStatus },
      after: { status: newStatus },
      channel: 'api',
    });

    this.realtime.emit(ORDER_EVENTS.STATUS_CHANGED, {
      orderId: id,
      oldStatus,
      newStatus,
    });

    this.logger.log(`Order #${id} status: ${oldStatus} → ${newStatus}`);
    return true;
  }

  /**
   * Cancel an order — domain write + outbox write in one transaction.
   */
  async cancelOrder(id: number, reason: string, operatorId = 'system') {
    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    const now = new Date().toISOString();

    await this.prisma.$transaction(async (tx) => {
      await tx.orders.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelled_at: now,
          cancellation_reason: reason,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.CANCELLED,
        { orderId: id, reason },
        { source: 'orders' },
      );
    });

    // Non-critical post-commit side effects
    this.audit.record({
      actor: operatorId,
      action: ORDER_EVENTS.CANCELLED,
      resource: 'orders',
      resourceId: id,
      before: { status: order.status },
      after: { status: OrderStatus.CANCELLED, reason },
      channel: 'api',
    });

    this.realtime.emit(ORDER_EVENTS.CANCELLED, { orderId: id, reason });

    return { orderId: id, status: OrderStatus.CANCELLED, reason };
  }

  /**
   * Get orders for a specific user.
   */
  async getOrdersByUser(userId: number, limit = 20) {
    return this.prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { order_items: true },
    });
  }
}
