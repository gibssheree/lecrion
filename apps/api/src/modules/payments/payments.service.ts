import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { OrderStatus, PaymentStatus } from '@libs/contracts/src/enums';
import { PAYMENT_EVENTS, ORDER_EVENTS } from '@libs/contracts/src/events';

export interface RecordPaymentDto {
  orderId: number;
  amount: number;
  paidAmount?: number;
  discount?: number;
  tax?: number;
  paymentMethod?: string;
  storeId?: string;
  operatorId?: string;
}

export interface ConfirmPaymentDto {
  paymentId: number;
  paidAmount: number;
  operatorId?: string;
}

/**
 * PaymentsService
 *
 * Manages payment records linked to orders.
 * Per 04-data-events.md § A (Revenue Ledger):
 *   - Tracks recognized sales
 *   - Payment status transitions: pending → paid
 *   - Refunds create counter-entries, not deletions
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
  ) {}

  /**
   * Record a payment for an order.
   * Creates a payment row in 'pending' status.
   */
  async recordPayment(dto: RecordPaymentDto) {
    const {
      orderId,
      amount,
      paidAmount = 0,
      discount = 0,
      tax = 0,
      paymentMethod = 'Cash',
      storeId = 'default-store',
      operatorId = 'system',
    } = dto;

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    const payment = await this.prisma.payments.create({
      data: {
        order_id: orderId,
        store_id: storeId,
        amount,
        paid_amount: paidAmount,
        discount,
        tax,
        payment_method: paymentMethod,
        status: PaymentStatus.PENDING,
        created_at: new Date().toISOString(),
      },
    });

    this.audit.record({
      actor: operatorId,
      action: PAYMENT_EVENTS.RECORDED,
      resource: 'payments',
      resourceId: payment.id,
      after: { orderId, amount, paymentMethod, status: PaymentStatus.PENDING },
      channel: 'api',
    });

    return { paymentId: payment.id, orderId, status: PaymentStatus.PENDING };
  }

  /**
   * Confirm a payment — marks it as paid and updates the order status.
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    const { paymentId, paidAmount, operatorId = 'system' } = dto;

    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });
    if (!payment)
      throw new NotFoundException(`Payment #${paymentId} not found`);
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException(`Payment #${paymentId} is already paid`);
    }

    const now = new Date().toISOString();

    await this.prisma.$transaction(async (tx) => {
      await tx.payments.update({
        where: { id: paymentId },
        data: {
          paid_amount: paidAmount,
          status: PaymentStatus.PAID,
          completed_at: now,
        },
      });

      // Payment confirmed → order moves to 'confirmed' (awaiting preparation)
      await tx.orders.update({
        where: { id: payment.order_id },
        data: { status: OrderStatus.CONFIRMED },
      });

      // Outbox write inside the transaction — atomic with domain writes
      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.CONFIRMED,
        {
          orderId: payment.order_id,
          paymentId,
          paidAmount,
          paymentMethod: payment.payment_method,
        },
        { storeId: payment.store_id, source: 'payments' },
      );
    });

    this.audit.record({
      actor: operatorId,
      action: PAYMENT_EVENTS.CONFIRMED,
      resource: 'payments',
      resourceId: paymentId,
      before: { status: PaymentStatus.PENDING },
      after: { status: PaymentStatus.PAID, paidAmount },
      storeId: payment.store_id,
      channel: 'api',
    });

    this.logger.log(
      `Payment #${paymentId} confirmed for order #${payment.order_id}`,
    );
    return {
      paymentId,
      orderId: payment.order_id,
      status: PaymentStatus.PAID,
      paidAmount,
    };
  }

  /**
   * Get payment(s) for an order.
   */
  async getPaymentsByOrder(orderId: number) {
    return this.prisma.payments.findMany({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get a single payment by ID.
   */
  async getPaymentById(paymentId: number) {
    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
    });
    if (!payment)
      throw new NotFoundException(`Payment #${paymentId} not found`);
    return payment;
  }

  /**
   * List recent payments for a store.
   */
  async listPayments(storeId = 'default-store', limit = 50) {
    return this.prisma.payments.findMany({
      where: { store_id: storeId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
