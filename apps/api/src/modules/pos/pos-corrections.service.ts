// apps/api/src/modules/pos/pos-corrections.service.ts
//
// PosCorrectionsService — Phase 5 enterprise correction flows.
//
// ── Void ──────────────────────────────────────────────────────────────────────
//   Allowed: confirmed, paid, completed — only if NO paid payments exist.
//   Action: order → CANCELLED (cancellation_reason = 'voided:<reason>')
//           pos_sales → VOIDED
//           pos_corrections document created
//   Cashflow: none (void = pre-settlement cancellation)
//   Stock: NOT restored (use return-items separately)
//
// ── Partial / Full Refund ─────────────────────────────────────────────────────
//   Allowed: confirmed, paid, completed, partially_refunded
//   Not allowed: cancelled, refunded
//   Refund is item-line based:
//     - caller specifies productId + refundQty per line
//     - if items[] is empty/omitted → full refund of all remaining refundable items
//     - refund amount = sum(refundQty × unitPrice) from order_items
//     - cannot exceed (paidTotal − alreadyRefunded)
//   Payment-line allocation:
//     - allocate refund proportionally across paid payment lines
//     - cash portion → cashflow_entries REFUND entry (reduces expected cash)
//     - non-cash portion → payment status update only (no cash drawer movement)
//   Order status:
//     - PARTIALLY_REFUNDED if remainingRefundable > 0 after this refund
//     - REFUNDED if fully refunded
//   pos_corrections document created for every refund operation
//
// ── Return Items ──────────────────────────────────────────────────────────────
//   Independent of refund — only restores stock
//   returnQty ≤ soldQty − alreadyReturnedQty per product
//   Writes stock_change_logs with change_type = RETURN
//   Links to pos_corrections document
//   Does NOT change order status
//
// ── Expected cash policy ──────────────────────────────────────────────────────
//   Cash refund creates cashflow_entries with entry_type = 'refund'.
//   CashflowService.getSessionBalance() subtracts refund entries.
//   RegisterService.getSessionSummary() reads refunds from ledger.
//   No direct mutation of cash_register_sessions.expected_cash.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { InventoryLedgerService } from '../inventory/inventory-ledger.service';
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
  POS_SALE_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { AuthUser } from '../auth/auth.types';
import {
  VoidOrderDto,
  VoidOrderResponse,
  RefundOrderDto,
  RefundOrderResponse,
  RefundPaymentAllocation,
  ReturnItemsDto,
  ReturnItemsResponse,
} from './pos-corrections.dto';
import { PosApprovalService } from './pos-approval.service';

/** Order statuses that are already terminal and cannot be voided/refunded */
const VOID_TERMINAL = new Set([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);

/** Order statuses eligible for void (no paid payments) */
const VOID_ELIGIBLE = new Set([
  OrderStatus.CONFIRMED,
  OrderStatus.PAID,
  OrderStatus.COMPLETED,
]);

/** Order statuses eligible for refund */
const REFUND_ELIGIBLE = new Set([
  OrderStatus.CONFIRMED,
  OrderStatus.PAID,
  OrderStatus.COMPLETED,
  OrderStatus.PARTIALLY_REFUNDED,
]);

const REFUND_TERMINAL = new Set([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);

@Injectable()
export class PosCorrectionsService {
  private readonly logger = new Logger(PosCorrectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
    private readonly realtime: RealtimeService,
    private readonly ledger: InventoryLedgerService,
    private readonly approval: PosApprovalService,
  ) {}

  // ── Void ────────────────────────────────────────────────────────────────────

  async voidOrder(
    orderId: number,
    dto: VoidOrderDto,
    user?: AuthUser,
  ): Promise<VoidOrderResponse> {
    const operatorId = dto.operatorId || user?.actor || 'system';
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('reason is required for void');

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    if (VOID_TERMINAL.has(order.status as any)) {
      throw new BadRequestException(
        `Order #${orderId} is already ${order.status} and cannot be voided`,
      );
    }
    if (!VOID_ELIGIBLE.has(order.status as any)) {
      throw new BadRequestException(
        `Order #${orderId} status "${order.status}" is not eligible for void`,
      );
    }

    const paidPayments = order.payments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );
    if (paidPayments.length > 0) {
      throw new BadRequestException(
        `Order #${orderId} has paid payment(s). Use refund instead of void.`,
      );
    }

    // ── Approval policy check ──────────────────────────────────────────────
    const voidPolicy = this.approval.checkVoidPolicy(order.created_at);
    if (voidPolicy.required) {
      if (!dto.managerApprovalId && (!dto.managerPin || !dto.approvedBy)) {
        throw new ForbiddenException(
          `Void memerlukan persetujuan manajer: ${voidPolicy.reason}. ` +
            `Sertakan managerPin dan approvedBy, atau managerApprovalId.`,
        );
      }
      // Verify PIN — throws ForbiddenException if wrong
      if (dto.managerApprovalId) {
        await this.approval.requireApprovedApproval(
          dto.managerApprovalId,
          'void',
        );
      } else {
        this.approval.verifyManagerPin(dto.managerPin!);
      }
    }

    const now = new Date().toISOString();
    let correctionNumber = '';
    let approvalId: number | null = null;

    // Create inline approval record if approval was required
    if (voidPolicy.required) {
      if (dto.managerApprovalId) {
        approvalId = dto.managerApprovalId;
      } else if (dto.managerPin && dto.approvedBy) {
        const inlineResult = await this.approval.inlineApprove({
          approvalType: 'void',
          requestedBy: operatorId,
          approvedBy: dto.approvedBy,
          reason,
          managerPin: dto.managerPin,
        });
        approvalId = inlineResult.approvalId;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const sale = await tx.pos_sales.findUnique({
        where: { order_id: orderId },
      });

      await tx.orders.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelled_at: now,
          cancellation_reason: `voided: ${reason}`,
        },
      });

      if (sale) {
        await tx.pos_sales.update({
          where: { id: sale.id },
          data: { status: PosSaleStatus.VOIDED },
        });
      }

      correctionNumber = this.buildCorrectionNumber(
        PosCorrectionType.VOID,
        orderId,
        now,
      );
      const correction = await tx.pos_corrections.create({
        data: {
          correction_number: correctionNumber,
          type: PosCorrectionType.VOID,
          reason,
          operator_id: operatorId,
          manager_approval_id: approvalId,
          original_order_id: orderId,
          sale_id: sale?.id ?? null,
          amount: 0,
          metadata: JSON.stringify({ previousStatus: order.status }),
          created_at: now,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.CANCELLED,
        { orderId, reason: `voided: ${reason}`, operatorId },
        { source: 'pos-corrections' },
      );
      await this.sync.writeOutboxInTx(
        tx,
        POS_CORRECTION_EVENTS.CREATED,
        {
          correctionId: correction.id,
          correctionNumber,
          type: PosCorrectionType.VOID,
          orderId,
          amount: 0,
        },
        { source: 'pos-corrections' },
      );
      if (sale) {
        await this.sync.writeOutboxInTx(
          tx,
          POS_SALE_EVENTS.VOIDED,
          { saleId: sale.id, orderId, receiptNumber: sale.receipt_number },
          { source: 'pos-corrections' },
        );
      }
    });

    this.audit.record({
      actor: operatorId,
      action: ORDER_EVENTS.CANCELLED,
      resource: 'orders',
      resourceId: orderId,
      before: { status: order.status },
      after: {
        status: OrderStatus.CANCELLED,
        cancellation_reason: `voided: ${reason}`,
      },
      channel: 'api',
    });
    this.realtime.emit(ORDER_EVENTS.CANCELLED, {
      orderId,
      reason: `voided: ${reason}`,
    });
    this.logger.log(`Order #${orderId} voided by ${operatorId}: ${reason}`);

    return {
      orderId,
      status: OrderStatus.CANCELLED,
      reason,
      voidedAt: now,
      correctionNumber,
    };
  }

  // ── Refund (partial or full) ─────────────────────────────────────────────────

  async refundOrder(
    orderId: number,
    dto: RefundOrderDto,
    user?: AuthUser,
  ): Promise<RefundOrderResponse> {
    const operatorId = dto.operatorId || user?.actor || 'system';
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('reason is required for refund');

    // Load order with items and payments
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { order_items: true, payments: true },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    if (REFUND_TERMINAL.has(order.status as any)) {
      throw new BadRequestException(
        `Order #${orderId} is already ${order.status} and cannot be refunded`,
      );
    }
    if (!REFUND_ELIGIBLE.has(order.status as any)) {
      throw new BadRequestException(
        `Order #${orderId} status "${order.status}" is not eligible for refund`,
      );
    }

    const paidPayments = order.payments.filter(
      (p) => p.status === PaymentStatus.PAID,
    );
    if (paidPayments.length === 0) {
      throw new BadRequestException(
        `Order #${orderId} has no paid payments to refund`,
      );
    }

    // Build unit price map from order_items
    const itemPriceMap = new Map<
      number,
      { name: string; unitPrice: number; soldQty: number }
    >();
    for (const item of order.order_items) {
      itemPriceMap.set(item.menu_id, {
        name: item.name,
        unitPrice: Number(item.price),
        soldQty: item.qty,
      });
    }

    // Compute already-refunded amount from pos_corrections
    const previousCorrections = await this.prisma.pos_corrections.findMany({
      where: { original_order_id: orderId, type: PosCorrectionType.REFUND },
      select: { amount: true },
    });
    const previouslyRefunded = previousCorrections.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    const paidTotal = paidPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const maxRefundable = this.roundMoney(paidTotal - previouslyRefunded);

    if (maxRefundable <= 0) {
      throw new BadRequestException(
        `Order #${orderId} has already been fully refunded (paid: ${paidTotal}, refunded: ${previouslyRefunded})`,
      );
    }

    // Resolve refund lines
    let refundLines: Array<{ productId: number; refundQty: number }>;
    if (!dto.items || dto.items.length === 0) {
      // Full refund of all items
      refundLines = order.order_items.map((item) => ({
        productId: item.menu_id,
        refundQty: item.qty,
      }));
    } else {
      refundLines = dto.items.map((l) => ({
        productId: l.productId,
        refundQty: l.refundQty,
      }));
    }

    // Validate and compute refund amount
    const refundedLines: RefundOrderResponse['refundedLines'] = [];
    let refundAmount = 0;

    for (const line of refundLines) {
      const item = itemPriceMap.get(line.productId);
      if (!item) {
        throw new BadRequestException(
          `Product #${line.productId} was not in order #${orderId}`,
        );
      }
      if (line.refundQty > item.soldQty) {
        throw new BadRequestException(
          `Cannot refund ${line.refundQty} of "${item.name}" — only ${item.soldQty} was sold`,
        );
      }
      const lineRefundAmount = this.roundMoney(line.refundQty * item.unitPrice);
      refundAmount += lineRefundAmount;
      refundedLines.push({
        productId: line.productId,
        name: item.name,
        refundQty: line.refundQty,
        unitPrice: item.unitPrice,
        lineRefundAmount,
      });
    }

    refundAmount = this.roundMoney(refundAmount);

    if (refundAmount > maxRefundable + 0.01) {
      throw new BadRequestException(
        `Refund amount ${refundAmount} exceeds remaining refundable amount ${maxRefundable} ` +
          `(paid: ${paidTotal}, previously refunded: ${previouslyRefunded})`,
      );
    }
    // Cap at maxRefundable to handle floating point edge cases
    refundAmount = Math.min(refundAmount, maxRefundable);

    // ── Approval policy check ──────────────────────────────────────────────
    const refundPolicy = this.approval.checkRefundPolicy(refundAmount);
    if (refundPolicy.required) {
      if (!dto.managerApprovalId && (!dto.managerPin || !dto.approvedBy)) {
        throw new ForbiddenException(
          `Refund memerlukan persetujuan manajer: ${refundPolicy.reason}. ` +
            `Sertakan managerPin dan approvedBy, atau managerApprovalId.`,
        );
      }
      if (dto.managerApprovalId) {
        await this.approval.requireApprovedApproval(
          dto.managerApprovalId,
          'refund',
        );
      } else {
        this.approval.verifyManagerPin(dto.managerPin!);
      }
    }

    const remainingRefundable = this.roundMoney(maxRefundable - refundAmount);
    const isFullRefund = remainingRefundable <= 0.01;
    const newOrderStatus = isFullRefund
      ? OrderStatus.REFUNDED
      : OrderStatus.PARTIALLY_REFUNDED;
    const newSaleStatus = isFullRefund
      ? PosSaleStatus.REFUNDED
      : PosSaleStatus.PARTIALLY_REFUNDED;

    const now = new Date().toISOString();
    const paymentAllocations: RefundPaymentAllocation[] = [];
    let cashflowEntriesCreated = 0;
    let correctionNumber = '';
    let refundApprovalId: number | null = null;

    // Create inline approval record if approval was required
    if (refundPolicy.required) {
      if (dto.managerApprovalId) {
        refundApprovalId = dto.managerApprovalId;
      } else if (dto.managerPin && dto.approvedBy) {
        const inlineResult = await this.approval.inlineApprove({
          approvalType: 'refund',
          requestedBy: operatorId,
          approvedBy: dto.approvedBy,
          reason,
          managerPin: dto.managerPin,
        });
        refundApprovalId = inlineResult.approvalId;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const sale = await tx.pos_sales.findUnique({
        where: { order_id: orderId },
      });

      // Update order status
      await tx.orders.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
      });

      if (sale) {
        await tx.pos_sales.update({
          where: { id: sale.id },
          data: { status: newSaleStatus },
        });
      }

      // Allocate refund across payment lines (cash first, then non-cash)
      const sortedPayments = [...paidPayments].sort((a, b) => {
        const aCash = this.isCashPayment(a.payment_method) ? 0 : 1;
        const bCash = this.isCashPayment(b.payment_method) ? 0 : 1;
        return aCash - bCash;
      });

      let remainingToAllocate = refundAmount;

      for (const payment of sortedPayments) {
        if (remainingToAllocate <= 0) break;

        const paymentAmount = Number(payment.amount);
        const allocate = Math.min(remainingToAllocate, paymentAmount);
        remainingToAllocate = this.roundMoney(remainingToAllocate - allocate);

        const isCash = this.isCashPayment(payment.payment_method);
        let cashflowEntryId: number | null = null;

        if (isCash && allocate > 0) {
          // Find original cashflow entry for session lookup
          const originalEntry = await tx.cashflow_entries.findFirst({
            where: {
              reference_type: 'order',
              reference_id: String(orderId),
              payment_method: payment.payment_method,
              entry_type: CashflowEntryType.INCOME,
            },
            orderBy: { created_at: 'asc' },
          });

          let sessionId: number | null = null;
          let storeId = payment.store_id;

          if (originalEntry) {
            sessionId = originalEntry.session_id;
            storeId = originalEntry.store_id;
          } else {
            const activeSession = await tx.cash_register_sessions.findFirst({
              where: { store_id: payment.store_id, status: 'open' },
            });
            if (activeSession) {
              sessionId = activeSession.id;
            } else {
              this.logger.warn(
                `Refund order #${orderId}: no active session for cash refund entry. ` +
                  `Payment #${payment.id} refunded but cashflow entry skipped.`,
              );
            }
          }

          if (sessionId !== null) {
            const cfEntry = await tx.cashflow_entries.create({
              data: {
                session_id: sessionId,
                store_id: storeId,
                entry_type: CashflowEntryType.REFUND,
                amount: allocate,
                payment_method: payment.payment_method,
                reference_type: 'order',
                reference_id: String(orderId),
                category: 'pos_refund',
                note: `Refund order #${orderId}: ${reason}`,
                operator_id: operatorId,
                created_at: now,
              },
            });
            cashflowEntryId = cfEntry.id;
            cashflowEntriesCreated++;

            await this.sync.writeOutboxInTx(
              tx,
              CASHFLOW_EVENTS.REFUND_RECORDED,
              {
                orderId,
                entryId: cfEntry.id,
                sessionId,
                amount: allocate,
                paymentMethod: payment.payment_method,
              },
              { source: 'pos-corrections' },
            );
          }
        }

        // Mark payment as refunded if fully allocated
        const isFullPaymentRefund = allocate >= paymentAmount - 0.01;
        if (isFullPaymentRefund) {
          await tx.payments.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }

        paymentAllocations.push({
          paymentId: payment.id,
          method: payment.payment_method,
          refundAmount: allocate,
          isCash,
          cashflowEntryId,
        });
      }

      // Create correction document
      correctionNumber = this.buildCorrectionNumber(
        PosCorrectionType.REFUND,
        orderId,
        now,
      );
      const correction = await tx.pos_corrections.create({
        data: {
          correction_number: correctionNumber,
          type: PosCorrectionType.REFUND,
          reason,
          operator_id: operatorId,
          manager_approval_id: refundApprovalId,
          original_order_id: orderId,
          sale_id: sale?.id ?? null,
          amount: refundAmount,
          metadata: JSON.stringify({
            refundedLines,
            paymentAllocations,
            previouslyRefunded,
            remainingRefundable,
            isFullRefund,
          }),
          created_at: now,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.REFUNDED,
        { orderId, refundAmount, reason, operatorId, isFullRefund },
        { source: 'pos-corrections' },
      );
      await this.sync.writeOutboxInTx(
        tx,
        POS_CORRECTION_EVENTS.CREATED,
        {
          correctionId: correction.id,
          correctionNumber,
          type: PosCorrectionType.REFUND,
          orderId,
          amount: refundAmount,
        },
        { source: 'pos-corrections' },
      );
      if (sale) {
        await this.sync.writeOutboxInTx(
          tx,
          POS_SALE_EVENTS.REFUNDED,
          {
            saleId: sale.id,
            orderId,
            receiptNumber: sale.receipt_number,
            refundAmount,
            isFullRefund,
          },
          { source: 'pos-corrections' },
        );
      }
    });

    this.audit.record({
      actor: operatorId,
      action: ORDER_EVENTS.REFUNDED,
      resource: 'orders',
      resourceId: orderId,
      before: { status: order.status },
      after: {
        status: newOrderStatus,
        refundAmount,
        reason,
        cashflowEntriesCreated,
        isFullRefund: isFullRefund,
      },
      channel: 'api',
    });
    this.realtime.emit(ORDER_EVENTS.REFUNDED, {
      orderId,
      refundAmount,
      reason,
      isFullRefund,
    });
    this.logger.log(
      `Order #${orderId} ${isFullRefund ? 'fully' : 'partially'} refunded by ${operatorId}: ` +
        `${reason}. Amount: ${refundAmount}, cashflow entries: ${cashflowEntriesCreated}`,
    );

    return {
      orderId,
      status: newOrderStatus,
      reason,
      refundedAt: now,
      correctionNumber,
      refundAmount,
      previouslyRefunded,
      remainingRefundable,
      paymentAllocations,
      cashflowEntriesCreated,
      refundedLines,
    };
  }

  // ── Return items ─────────────────────────────────────────────────────────────

  async returnItems(
    orderId: number,
    dto: ReturnItemsDto,
    user?: AuthUser,
  ): Promise<ReturnItemsResponse> {
    const operatorId = dto.operatorId || user?.actor || 'system';
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('reason is required for return');
    if (!dto.items.length)
      throw new BadRequestException('At least one item is required for return');

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { order_items: true, payments: true },
    });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    // Build sold qty map
    const soldQtyMap = new Map<number, { name: string; soldQty: number }>();
    for (const item of order.order_items) {
      soldQtyMap.set(item.menu_id, { name: item.name, soldQty: item.qty });
    }

    // Aggregate requested return qtys (handle duplicate productId in request)
    const requestedQtyMap = new Map<number, number>();
    for (const ri of dto.items) {
      requestedQtyMap.set(
        ri.productId,
        (requestedQtyMap.get(ri.productId) ?? 0) + ri.returnQty,
      );
    }

    // Load already-returned qtys from stock_change_logs
    const previousReturns = await this.prisma.stock_change_logs.findMany({
      where: { order_id: orderId, change_type: StockMovementType.RETURN },
      select: { menu_id: true, qty_change: true },
    });
    const previouslyReturnedMap = new Map<number, number>();
    for (const row of previousReturns) {
      previouslyReturnedMap.set(
        row.menu_id,
        (previouslyReturnedMap.get(row.menu_id) ?? 0) +
          Math.max(0, row.qty_change),
      );
    }

    // Validate all lines before writing
    for (const [productId, requestedQty] of requestedQtyMap.entries()) {
      const sold = soldQtyMap.get(productId);
      if (!sold) {
        throw new BadRequestException(
          `Product #${productId} was not in order #${orderId}`,
        );
      }
      const alreadyReturned = previouslyReturnedMap.get(productId) ?? 0;
      const remainingReturnable = sold.soldQty - alreadyReturned;
      if (requestedQty > remainingReturnable) {
        throw new BadRequestException(
          `Cannot return ${requestedQty} of "${sold.name}" — ` +
            `sold: ${sold.soldQty}, already returned: ${alreadyReturned}, remaining: ${remainingReturnable}`,
        );
      }
    }

    const now = new Date().toISOString();
    const returnedItems: ReturnItemsResponse['returnedItems'] = [];
    const storeId = order.payments[0]?.store_id ?? 'default-store';
    let correctionNumber = '';

    await this.prisma.$transaction(async (tx) => {
      const sale = await tx.pos_sales.findUnique({
        where: { order_id: orderId },
      });

      for (const [productId, returnQty] of requestedQtyMap.entries()) {
        const sold = soldQtyMap.get(productId)!;

        const product = await tx.menu.findUnique({
          where: { id: productId },
          select: { stock: true },
        });
        if (!product)
          throw new NotFoundException(`Product #${productId} not found`);

        const stockBefore = product.stock;
        const stockAfter = stockBefore + returnQty;

        await tx.menu.update({
          where: { id: productId },
          data: { stock: stockAfter },
        });

        await tx.stock_change_logs.create({
          data: {
            menu_id: productId,
            order_id: orderId,
            change_type: StockMovementType.RETURN,
            qty_before: stockBefore,
            qty_change: returnQty,
            qty_after: stockAfter,
            note: `Return from order #${orderId}: ${reason}`,
            store_id: storeId,
            operator_id: operatorId,
            source_ref: `return-order-${orderId}`,
            created_at: now,
          },
        });

        await this.sync.writeOutboxInTx(
          tx,
          STOCK_EVENTS.ADJUSTED,
          {
            orderId,
            productId,
            qtyChange: returnQty,
            qtyAfter: stockAfter,
            reason: StockMovementType.RETURN,
          },
          { source: 'pos-corrections', storeId },
        );

        returnedItems.push({
          productId,
          name: sold.name,
          returnQty,
          stockBefore,
          stockAfter,
        });
      }

      correctionNumber = this.buildCorrectionNumber(
        PosCorrectionType.RETURN,
        orderId,
        now,
      );
      const correction = await tx.pos_corrections.create({
        data: {
          correction_number: correctionNumber,
          type: PosCorrectionType.RETURN,
          reason,
          operator_id: operatorId,
          original_order_id: orderId,
          sale_id: sale?.id ?? null,
          amount: 0,
          metadata: JSON.stringify({ returnedItems }),
          created_at: now,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        POS_CORRECTION_EVENTS.CREATED,
        {
          correctionId: correction.id,
          correctionNumber,
          type: PosCorrectionType.RETURN,
          orderId,
          amount: 0,
        },
        { source: 'pos-corrections', storeId },
      );
    });

    this.audit.record({
      actor: operatorId,
      action: 'order.return_items',
      resource: 'orders',
      resourceId: orderId,
      after: { reason, returnedItems, correctionNumber },
      channel: 'api',
    });
    this.logger.log(
      `Return items for order #${orderId} by ${operatorId}: ${requestedQtyMap.size} product(s) returned`,
    );

    return {
      orderId,
      reason,
      returnedAt: now,
      correctionNumber,
      returnedItems,
    };
  }

  // ── List corrections (for Returns / Refunds dashboard) ──────────────────────

  /**
   * List correction documents with optional filters.
   *
   * Used by the Retur / Refund page to show all void/refund/return events.
   * Joins to orders for receipt number context.
   */
  async listCorrections(params: {
    type?: string;
    storeId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{
      id: number;
      correctionNumber: string;
      type: string;
      reason: string;
      operatorId: string;
      orderId: number;
      saleId: number | null;
      receiptNumber: string | null;
      amount: number;
      metadata: any;
      createdAt: string;
    }>;
    total: number;
  }> {
    const limit = Math.min(Number(params.limit) || 50, 200);
    const offset = Number(params.offset) || 0;

    const where: Record<string, unknown> = {};
    if (params.type) where['type'] = params.type;
    if (params.fromDate || params.toDate) {
      const range: Record<string, string> = {};
      if (params.fromDate) range['gte'] = params.fromDate;
      if (params.toDate) range['lte'] = params.toDate;
      where['created_at'] = range;
    }

    const [rows, total] = await Promise.all([
      this.prisma.pos_corrections.findMany({
        where,
        include: { pos_sales: { select: { receipt_number: true } } },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.pos_corrections.count({ where }),
    ]);

    const items = rows.map((row) => {
      let metadata: any = null;
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : null;
      } catch {
        metadata = row.metadata;
      }
      return {
        id: row.id,
        correctionNumber: row.correction_number,
        type: row.type,
        reason: row.reason,
        operatorId: row.operator_id,
        orderId: row.original_order_id,
        saleId: row.sale_id,
        receiptNumber: row.pos_sales?.receipt_number ?? null,
        amount: Number(row.amount),
        metadata,
        createdAt: row.created_at,
      };
    });

    return { items, total };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private isCashPayment(method: string): boolean {
    return method.trim().toLowerCase() === 'cash';
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private buildCorrectionNumber(
    type: string,
    orderId: number,
    now: string,
  ): string {
    const compactDate = now.slice(0, 10).replace(/-/g, '');
    const compactTime = now.replace(/[^0-9]/g, '').slice(8, 17);
    return `COR-${type.toUpperCase()}-${compactDate}-${orderId}-${compactTime}`;
  }
}
