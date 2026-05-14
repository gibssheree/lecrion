import { Injectable, Logger } from '@nestjs/common';
import {
  CashflowService,
  OpenSessionDto,
  CloseSessionDto,
} from '../cashflow/cashflow.service';
import { PrismaService } from '@libs/db/src/prisma';
import { RegisterSessionStatus } from '@libs/contracts/src/enums';
import { REGISTER_EVENTS } from '@libs/contracts/src/events';

/**
 * RegisterService
 *
 * Dedicated register session module per 03-file-architecture.md.
 * Delegates to CashflowService for the actual ledger operations.
 *
 * Per 02-roadmap.md Phase 2: "Register open/close session module"
 * Per 04-data-events.md § 4: Cash Register Lifecycle
 *   States: open → suspended → closed
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
}
