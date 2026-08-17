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
import { OpenSessionDto, CloseSessionDto, RecordEntryDto } from './cashflow.dto';

// Re-export the type so register.service and controller can import from here
export type { CashflowEntryTypeValue as CashflowEntryType };
export { OpenSessionDto, CloseSessionDto, RecordEntryDto };

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
   *
   * `storeId` is a required argument, not read from `dto` (SEC-06) — the
   * caller's store must come from the authenticated request (@StoreId()),
   * never from a value the client typed into the request body.
   */
  async openSession(storeId: string, dto: OpenSessionDto) {
    const { cashierId, openingCash = 0, notes = '' } = dto;

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
   *
   * `storeId` required (SEC-06) — previously this looked the session up by
   * id alone, so any authenticated user of any store could close (and
   * finalize the cash count of) another store's register session.
   */
  async closeSession(storeId: string, dto: CloseSessionDto) {
    const { sessionId, countedCash, notes = '', operatorId } = dto;

    const session = await this.prisma.cash_register_sessions.findFirst({
      where: { id: sessionId, store_id: storeId },
    });
    if (!session)
      throw new NotFoundException(`Session #${sessionId} not found`);
    if (session.status !== RegisterSessionStatus.OPEN) {
      throw new BadRequestException(
        `Session #${sessionId} is already ${session.status}`,
      );
    }

    const balance = await this.getSessionBalance(sessionId, storeId);
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
   *
   * `storeId` is a required argument, not read from `dto` (SEC-06) — see
   * openSession() for why.
   */
  async recordEntry(storeId: string, dto: RecordEntryDto) {
    const {
      entryType,
      amount,
      operatorId,
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
    } else {
      // A sessionId was supplied explicitly — verify it's actually this
      // store's session (SEC-06) before writing an entry into it. Without
      // this check a caller could pass any session id and post cashflow
      // entries into another store's ledger.
      const owned = await this.prisma.cash_register_sessions.findFirst({
        where: { id: resolvedSessionId, store_id: storeId },
        select: { id: true },
      });
      if (!owned) {
        throw new BadRequestException(
          `Session #${resolvedSessionId} not found for this store`,
        );
      }
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
   *
   * `storeId` required (SEC-06) — verifies the session belongs to the
   * caller's store before reading its ledger.
   */
  async getSessionBalance(sessionId: number, storeId: string): Promise<number> {
    const owned = await this.prisma.cash_register_sessions.findFirst({
      where: { id: sessionId, store_id: storeId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException(`Session #${sessionId} not found`);

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
   *
   * `storeId` required (SEC-06) — verifies the session belongs to the
   * caller's store before reading its ledger.
   */
  async listEntries(sessionId: number, storeId: string, limit = 100) {
    const owned = await this.prisma.cash_register_sessions.findFirst({
      where: { id: sessionId, store_id: storeId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException(`Session #${sessionId} not found`);

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
