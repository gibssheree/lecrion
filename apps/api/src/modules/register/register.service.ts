import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  CashflowService,
  OpenSessionDto,
  CloseSessionDto,
} from '../cashflow/cashflow.service';
import { PrismaService } from '@libs/db/src/prisma';
import {
  CashflowEntryType,
  RegisterSessionStatus,
} from '@libs/contracts/src/enums';
import { REGISTER_EVENTS } from '@libs/contracts/src/events';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CashAdjustmentDto {
  /** 'cash_in' | 'cash_out' | 'expense' | 'refund' */
  adjustmentType: 'cash_in' | 'cash_out' | 'expense' | 'refund';
  amount: number;
  operatorId: string;
  note?: string;
  category?: string;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface NonCashBreakdown {
  method: string;
  total: number;
}

export interface SoldProductSummary {
  productId: number;
  name: string;
  qty: number;
  lineTotal: number;
}

export interface SessionSummaryResponse {
  sessionId: number;
  cashierId: string;
  storeId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  /** Opening cash at session start */
  openingCash: number;
  /** Total cash sales (income entries with payment_method=Cash, category=pos_sale) */
  cashSales: number;
  /** Non-cash sales grouped by payment method */
  nonCashSales: NonCashBreakdown[];
  /** Total non-cash sales */
  nonCashSalesTotal: number;
  /** Cash-in adjustments (manual cash_in entries) */
  cashIn: number;
  /** Cash-out / expense adjustments */
  cashOut: number;
  /** Refunds (cash refunds reduce expected cash) */
  refunds: number;
  /**
   * Expected cash = opening_cash + cashSales + cashIn - cashOut - refunds
   * Derived from ledger (consistent with closeSession policy).
   */
  expectedCash: number;
  /** Counted cash — null if session not yet closed */
  countedCash: number | null;
  /** Variance = countedCash - expectedCash; null if not yet closed */
  variance: number | null;
  /** Total number of POS sale transactions */
  transactionCount: number;
  /** Sold products summary derived from order_items for this session */
  soldProducts: SoldProductSummary[];
  /** ISO timestamp of first sale in this session; null if no sales */
  firstSaleTime: string | null;
  /** ISO timestamp of last sale in this session; null if no sales */
  lastSaleTime: string | null;
}

/**
 * RegisterService
 *
 * Dedicated register session module per 03-file-architecture.md.
 * Delegates to CashflowService for the actual ledger operations.
 *
 * Per 02-roadmap.md Phase 2: "Register open/close session module"
 * Per 04-data-events.md § 4: Cash Register Lifecycle
 *   States: open → suspended → closed
 *
 * Phase 2 additions:
 *   - getSessionSummary(): ledger-derived shift summary
 *   - recordCashAdjustment(): cash-in / cash-out / expense / refund
 */
@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly cashflow: CashflowService,
    private readonly prisma: PrismaService,
  ) {}

  async openSession(dto: OpenSessionDto) {
    this.logger.log(
      `Opening register session for store=${dto.storeId ?? 'default-store'} cashier=${dto.cashierId}`,
    );
    return this.cashflow.openSession(dto);
  }

  async closeSession(dto: CloseSessionDto) {
    this.logger.log(`Closing register session #${dto.sessionId}`);
    return this.cashflow.closeSession(dto);
  }

  async getActiveSession(storeId = 'default-store') {
    return this.cashflow.getActiveSession(storeId);
  }

  async getSessionById(sessionId: number) {
    return this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
  }

  async listSessions(storeId = 'default-store', limit = 20) {
    return this.cashflow.listSessions(storeId, limit);
  }

  async getSessionBalance(sessionId: number) {
    return this.cashflow.getSessionBalance(sessionId);
  }

  /**
   * Suspend a session (e.g. shift break).
   */
  async suspendSession(sessionId: number, operatorId: string) {
    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== RegisterSessionStatus.OPEN) {
      throw new Error(`Session #${sessionId} is not open`);
    }

    await this.prisma.cash_register_sessions.update({
      where: { id: sessionId },
      data: { status: RegisterSessionStatus.SUSPENDED },
    });

    this.logger.log(`Session #${sessionId} suspended by ${operatorId}`);
    return { sessionId, status: RegisterSessionStatus.SUSPENDED };
  }

  /**
   * Resume a suspended session.
   */
  async resumeSession(sessionId: number, operatorId: string) {
    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== RegisterSessionStatus.SUSPENDED) {
      throw new Error(`Session #${sessionId} is not suspended`);
    }

    await this.prisma.cash_register_sessions.update({
      where: { id: sessionId },
      data: { status: RegisterSessionStatus.OPEN },
    });

    this.logger.log(`Session #${sessionId} resumed by ${operatorId}`);
    return { sessionId, status: RegisterSessionStatus.OPEN };
  }

  // ── Phase 2: Shift Summary ─────────────────────────────────────────────────

  /**
   * Build a full ledger-derived shift summary for a register session.
   *
   * Policy (consistent with CashflowService.closeSession):
   *   expectedCash = openingCash + cashSales + cashIn - cashOut - refunds
   *
   * PosSalesService also increments cash_register_sessions.expected_cash
   * incrementally during the session. Both approaches converge to the same
   * number because every cash movement writes a cashflow_entry. The summary
   * always recomputes from the ledger so it is always authoritative.
   *
   * Non-cash sales (Transfer, QRIS, GoPay) are read from cashflow_entries
   * where category = 'pos_sale' and payment_method != 'Cash'. They do NOT
   * affect expectedCash.
   *
   * Refunds: currently 0 unless a refund cashflow_entry exists for this
   * session. Field is always present in the response.
   */
  async getSessionSummary(sessionId: number): Promise<SessionSummaryResponse> {
    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session #${sessionId} not found`);
    }

    // ── 1. Load all cashflow entries for this session ──────────────────────
    const entries = await this.prisma.cashflow_entries.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });

    // ── 2. Aggregate cashflow entries ──────────────────────────────────────
    let cashSales = 0;
    let cashIn = 0;
    let cashOut = 0;
    let refunds = 0;
    const nonCashMap = new Map<string, number>();

    for (const entry of entries) {
      const amount = Number(entry.amount);
      const isCash = entry.payment_method.trim().toLowerCase() === 'cash';
      const isPosSale = entry.category === 'pos_sale';

      if (entry.entry_type === CashflowEntryType.INCOME) {
        if (isPosSale && isCash) {
          cashSales += amount;
        } else if (isPosSale && !isCash) {
          // Non-cash POS sale entries are informational. The authoritative
          // non-cash sales total is rebuilt from paid, non-refunded payments
          // after orderIds are known, so refunded QRIS/Transfer sales do not
          // remain in the active shift sales breakdown.
        } else {
          // Manual cash-in adjustment
          cashIn += amount;
        }
      } else if (entry.entry_type === CashflowEntryType.EXPENSE) {
        cashOut += amount;
      } else if (entry.entry_type === CashflowEntryType.REFUND) {
        refunds += amount;
      }
    }

    const openingCash = Number(session.opening_cash);
    const expectedCash = openingCash + cashSales + cashIn - cashOut - refunds;

    // ── 3. Load order_items for this session to build sold products summary ─
    // Orders linked to this session via cashflow_entries reference_id (order id)
    const orderIds = [
      ...new Set(
        entries
          .filter(
            (e) =>
              e.reference_type === 'order' &&
              e.reference_id !== null &&
              e.category === 'pos_sale',
          )
          .map((e) => Number(e.reference_id))
          .filter((id) => !isNaN(id) && id > 0),
      ),
    ];

    if (orderIds.length > 0) {
      const nonCashPayments = await this.prisma.payments.findMany({
        where: {
          order_id: { in: orderIds },
          status: 'paid',
          payment_method: { not: 'Cash' },
          orders: {
            status: { notIn: ['cancelled', 'refunded'] },
          },
        },
        select: {
          payment_method: true,
          amount: true,
        },
      });

      for (const payment of nonCashPayments) {
        const method = payment.payment_method;
        nonCashMap.set(
          method,
          (nonCashMap.get(method) ?? 0) + Number(payment.amount),
        );
      }
    }

    const nonCashSales: NonCashBreakdown[] = Array.from(
      nonCashMap.entries(),
    ).map(([method, total]) => ({ method, total }));
    const nonCashSalesTotal = nonCashSales.reduce((s, r) => s + r.total, 0);

    let soldProducts: SoldProductSummary[] = [];
    let firstSaleTime: string | null = null;
    let lastSaleTime: string | null = null;
    let transactionCount = 0;

    if (orderIds.length > 0) {
      const orders = await this.prisma.orders.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, status: true, created_at: true },
        orderBy: { created_at: 'asc' },
      });
      const activeOrderIds = orders
        .filter(
          (order) =>
            order.status !== 'cancelled' && order.status !== 'refunded',
        )
        .map((order) => order.id);

      const orderItems = await this.prisma.order_items.findMany({
        where: { order_id: { in: activeOrderIds } },
        select: {
          order_id: true,
          menu_id: true,
          name: true,
          price: true,
          qty: true,
        },
      });

      // Aggregate by product
      const productMap = new Map<
        number,
        { name: string; qty: number; lineTotal: number }
      >();
      for (const item of orderItems) {
        const existing = productMap.get(item.menu_id);
        const lineTotal = Number(item.price) * item.qty;
        if (existing) {
          existing.qty += item.qty;
          existing.lineTotal += lineTotal;
        } else {
          productMap.set(item.menu_id, {
            name: item.name,
            qty: item.qty,
            lineTotal,
          });
        }
      }

      soldProducts = Array.from(productMap.entries())
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.qty - a.qty);

      // Transaction count = active paid/confirmed POS sale orders, excluding
      // refunded/cancelled corrections.
      transactionCount = activeOrderIds.length;

      // First/last sale time from orders
      const activeOrders = orders.filter((order) =>
        activeOrderIds.includes(order.id),
      );
      if (activeOrders.length > 0) {
        firstSaleTime = activeOrders[0].created_at;
        lastSaleTime = activeOrders[activeOrders.length - 1].created_at;
      }
    }

    return {
      sessionId,
      cashierId: session.cashier_id,
      storeId: session.store_id,
      status: session.status,
      openedAt: session.opened_at,
      closedAt: session.closed_at ?? null,
      openingCash,
      cashSales,
      nonCashSales,
      nonCashSalesTotal,
      cashIn,
      cashOut,
      refunds,
      expectedCash,
      countedCash:
        session.counted_cash !== null && session.counted_cash !== undefined
          ? Number(session.counted_cash)
          : null,
      variance:
        session.variance !== null && session.variance !== undefined
          ? Number(session.variance)
          : null,
      transactionCount,
      soldProducts,
      firstSaleTime,
      lastSaleTime,
    };
  }

  // ── Phase 2: Cash Adjustment ───────────────────────────────────────────────

  /**
   * Record a manual cash adjustment for an open register session.
   *
   * Adjustment types:
   *   cash_in  → CashflowEntryType.INCOME  (category: 'cash_in')
   *   cash_out → CashflowEntryType.EXPENSE (category: 'cash_out')
   *   expense  → CashflowEntryType.EXPENSE (category: 'expense')
   *   refund   → CashflowEntryType.REFUND  (category: 'refund')
   *
   * No schema changes required — uses existing cashflow_entries table.
   */
  async recordCashAdjustment(
    sessionId: number,
    dto: CashAdjustmentDto,
  ): Promise<{
    entryId: number;
    sessionId: number;
    adjustmentType: string;
    amount: number;
  }> {
    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session #${sessionId} not found`);
    }
    if (session.status !== RegisterSessionStatus.OPEN) {
      throw new BadRequestException(
        `Session #${sessionId} is ${session.status}. Cash adjustments require an open session.`,
      );
    }
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const typeMap: Record<
      CashAdjustmentDto['adjustmentType'],
      { entryType: string; category: string }
    > = {
      cash_in: { entryType: CashflowEntryType.INCOME, category: 'cash_in' },
      cash_out: { entryType: CashflowEntryType.EXPENSE, category: 'cash_out' },
      expense: { entryType: CashflowEntryType.EXPENSE, category: 'expense' },
      refund: { entryType: CashflowEntryType.REFUND, category: 'refund' },
    };

    const { entryType, category } = typeMap[dto.adjustmentType];

    const entry = await this.prisma.cashflow_entries.create({
      data: {
        session_id: sessionId,
        store_id: session.store_id,
        entry_type: entryType,
        amount: Number(dto.amount),
        payment_method: 'Cash',
        reference_type: 'adjustment',
        reference_id: null,
        category,
        note: dto.note ?? '',
        operator_id: dto.operatorId,
        created_at: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Cash adjustment recorded: session #${sessionId} type=${dto.adjustmentType} amount=${dto.amount} by ${dto.operatorId}`,
    );

    return {
      entryId: entry.id,
      sessionId,
      adjustmentType: dto.adjustmentType,
      amount: Number(dto.amount),
    };
  }
}
