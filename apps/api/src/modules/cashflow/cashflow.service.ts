import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import {
  CashflowEntryType,
  CashflowEntryTypeValue,
  RegisterSessionStatus,
} from '@libs/contracts/src/enums';
import { CASHFLOW_EVENTS, REGISTER_EVENTS } from '@libs/contracts/src/events';

// Re-export the type so register.service and controller can import from here
export type { CashflowEntryTypeValue as CashflowEntryType };

export interface OpenSessionDto {
  storeId?: string;
  cashierId: string;
  openingCash?: number;
  notes?: string;
}

export interface CloseSessionDto {
  sessionId: number;
  countedCash: number;
  notes?: string;
  operatorId: string;
}

export interface RecordEntryDto {
  entryType: CashflowEntryTypeValue;
  amount: number;
  operatorId: string;
  storeId?: string;
  sessionId?: number;
  referenceType?: string;
  referenceId?: string;
  category?: string;
  note?: string;
  paymentMethod?: string;
}

/**
 * CashflowService
 *
 * Cashflow ledger — tracks actual money movement per register session.
 * Per 04-data-events.md § B:
 *   - Every cash event is INSERT-only (append-only ledger)
 *   - Cancellations create NEGATIVE counter-entries, not deletions
 *   - Balance = SUM of all entries for a session
 */
@Injectable()
export class CashflowService {
  private readonly logger = new Logger(CashflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Open a new cash register session.
   * Only one active session per store is allowed.
   */
  async openSession(dto: OpenSessionDto) {
    const {
      storeId = 'default-store',
      cashierId,
      openingCash = 0,
      notes = '',
    } = dto;

    const existing = await this.prisma.cash_register_sessions.findFirst({
      where: { store_id: storeId, status: RegisterSessionStatus.OPEN },
    });

    if (existing) {
      throw new BadRequestException(
        `Register session #${existing.id} is already open for this store`,
      );
    }

    const session = await this.prisma.cash_register_sessions.create({
      data: {
        store_id: storeId,
        cashier_id: cashierId,
        opening_cash: openingCash,
        expected_cash: openingCash,
        notes: notes || null,
        status: RegisterSessionStatus.OPEN,
      },
    });

    this.audit.record({
      actor: cashierId,
      action: REGISTER_EVENTS.OPENED,
      resource: 'cash_register_sessions',
      resourceId: session.id,
      after: { storeId, openingCash },
      channel: 'api',
    });

    this.logger.log(`Register session opened #${session.id} by ${cashierId}`);
    return { sessionId: session.id };
  }

  /**
   * Close a register session. Computes variance = counted - expected.
   */
  async closeSession(dto: CloseSessionDto) {
    const { sessionId, countedCash, notes = '', operatorId } = dto;

    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session)
      throw new NotFoundException(`Session #${sessionId} not found`);
    if (session.status !== RegisterSessionStatus.OPEN) {
      throw new BadRequestException(
        `Session #${sessionId} is already ${session.status}`,
      );
    }

    const balance = await this.getSessionBalance(sessionId);
    const expected = balance + Number(session.opening_cash);
    const variance = Number(countedCash) - expected;

    await this.prisma.cash_register_sessions.update({
      where: { id: sessionId },
      data: {
        status: RegisterSessionStatus.CLOSED,
        counted_cash: countedCash,
        expected_cash: expected,
        variance,
        notes: notes || null,
        closed_at: new Date().toISOString(),
      },
    });

    this.audit.record({
      actor: operatorId,
      action: REGISTER_EVENTS.CLOSED,
      resource: 'cash_register_sessions',
      resourceId: sessionId,
      before: {
        status: RegisterSessionStatus.OPEN,
        expected_cash: session.expected_cash,
      },
      after: {
        status: RegisterSessionStatus.CLOSED,
        countedCash,
        expected,
        variance,
      },
      channel: 'api',
    });

    this.logger.log(
      `Register session #${sessionId} closed. Variance: ${variance}`,
    );
    return { sessionId, countedCash, expected, variance };
  }

  /**
   * Record a cash-in or cash-out entry (append-only ledger).
   */
  async recordEntry(dto: RecordEntryDto) {
    const {
      entryType,
      amount,
      operatorId,
      storeId = 'default-store',
      sessionId,
      referenceType,
      referenceId,
      category,
      note,
      paymentMethod = 'Cash',
    } = dto;

    const validEntryTypes = Object.values(CashflowEntryType) as string[];
    if (!validEntryTypes.includes(entryType)) {
      throw new BadRequestException(
        `Invalid entryType: "${entryType}". Valid values: ${validEntryTypes.join(', ')}`,
      );
    }
    if (Number(amount) <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    let resolvedSessionId = sessionId;
    if (!resolvedSessionId) {
      const active = await this.prisma.cash_register_sessions.findFirst({
        where: { store_id: storeId, status: RegisterSessionStatus.OPEN },
      });
      if (!active) {
        throw new BadRequestException(
          'No open register session. Open a session before recording cashflow.',
        );
      }
      resolvedSessionId = active.id;
    }

    const entry = await this.prisma.cashflow_entries.create({
      data: {
        session_id: resolvedSessionId,
        store_id: storeId,
        entry_type: entryType,
        amount,
        payment_method: paymentMethod,
        reference_type: referenceType ?? null,
        reference_id: referenceId ?? null,
        category: category ?? null,
        note: note ?? '',
        operator_id: operatorId,
        created_at: new Date().toISOString(),
      },
    });

    // Map entryType to the canonical event name
    const eventMap: Record<string, string> = {
      [CashflowEntryType.INCOME]: CASHFLOW_EVENTS.INCOME_RECORDED,
      [CashflowEntryType.EXPENSE]: CASHFLOW_EVENTS.EXPENSE_RECORDED,
      [CashflowEntryType.REFUND]: CASHFLOW_EVENTS.REFUND_RECORDED,
    };
    this.audit.record({
      actor: operatorId,
      action: eventMap[entryType] ?? `cashflow.${entryType}.recorded`,
      resource: 'cashflow_entries',
      resourceId: entry.id,
      after: { entryType, amount, paymentMethod },
      channel: 'api',
    });

    return { entryId: entry.id, sessionId: resolvedSessionId };
  }

  /**
   * Get running balance for a session.
   * Income is positive, expense/refund is negative.
   */
  async getSessionBalance(sessionId: number): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ entry_type: string; total: number }>
    >(
      `SELECT entry_type, SUM(amount) AS total
       FROM cashflow_entries
       WHERE session_id = ? AND lower(payment_method) = 'cash'
       GROUP BY entry_type`,
      sessionId,
    );

    let balance = 0;
    for (const row of rows) {
      if (row.entry_type === 'income') balance += Number(row.total);
      else balance -= Number(row.total);
    }
    return balance;
  }

  /**
   * Get the active register session for a store.
   */
  async getActiveSession(storeId = 'default-store') {
    return this.prisma.cash_register_sessions.findFirst({
      where: { store_id: storeId, status: RegisterSessionStatus.OPEN },
    });
  }

  /**
   * List cashflow entries for a session.
   */
  async listEntries(sessionId: number, limit = 100) {
    return this.prisma.cashflow_entries.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * List all register sessions for a store.
   */
  async listSessions(storeId = 'default-store', limit = 20) {
    return this.prisma.cash_register_sessions.findMany({
      where: { store_id: storeId },
      orderBy: { opened_at: 'desc' },
      take: limit,
    });
  }
}
