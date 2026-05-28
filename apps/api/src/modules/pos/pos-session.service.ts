import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { StoresService } from '../stores/stores.service';
import { RegisterSessionStatus } from '@libs/contracts/src/enums';
import {
  CloseSessionDto,
  OpenSessionDto,
  SessionSummary,
} from './pos-session.dto';
import { AuthUser } from '../auth/auth.types';

@Injectable()
export class PosSessionService {
  private readonly logger = new Logger(PosSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private mapSession(row: {
    id: number;
    store_id: string;
    cashier_id: string;
    status: string;
    opening_cash: number;
    expected_cash: number;
    counted_cash: number | null;
    variance: number | null;
    notes: string | null;
    opened_at: string;
    closed_at: string | null;
  }): SessionSummary {
    return {
      id: row.id,
      storeId: row.store_id,
      cashierId: row.cashier_id,
      status: row.status,
      openingCash: row.opening_cash,
      expectedCash: row.expected_cash,
      countedCash: row.counted_cash,
      variance: row.variance,
      notes: row.notes,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
    };
  }

  // ── Open session ──────────────────────────────────────────────────────────

  async openSession(dto: OpenSessionDto, user: AuthUser): Promise<SessionSummary> {
    const storeId = user.storeId ?? 'default-store';
    const cashierId = user.actor ?? user.email;

    // Enforce: only one open session per cashier per store
    const existing = await this.prisma.cash_register_sessions.findFirst({
      where: {
        cashier_id: cashierId,
        store_id: storeId,
        status: RegisterSessionStatus.OPEN,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Kasir sudah memiliki sesi aktif #${existing.id}. Tutup sesi terlebih dahulu.`,
      );
    }

    // Read setting: requireOpeningCash
    const requireOpeningCash = await this.stores.getSetting(
      'requireOpeningCash',
      'false',
      storeId,
    );

    if (requireOpeningCash === 'true' && dto.openingCash == null) {
      throw new BadRequestException(
        'Nominal kas awal wajib diisi (pengaturan requireOpeningCash aktif)',
      );
    }

    const session = await this.prisma.cash_register_sessions.create({
      data: {
        cashier_id: cashierId,
        store_id: storeId,
        status: RegisterSessionStatus.OPEN,
        opening_cash: dto.openingCash ?? 0,
        expected_cash: dto.openingCash ?? 0,
        notes: dto.notes ?? null,
        opened_at: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Session #${session.id} opened by ${cashierId} (store: ${storeId}, opening: ${session.opening_cash})`,
    );

    return this.mapSession(session);
  }

  // ── Close session ─────────────────────────────────────────────────────────

  async closeSession(
    sessionId: number,
    dto: CloseSessionDto,
    user: AuthUser,
  ): Promise<SessionSummary> {
    const storeId = user.storeId ?? 'default-store';
    const cashierId = user.actor ?? user.email;

    const session = await this.prisma.cash_register_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException(`Sesi #${sessionId} tidak ditemukan`);

    if (session.status === RegisterSessionStatus.CLOSED) {
      throw new BadRequestException(`Sesi #${sessionId} sudah ditutup`);
    }

    if (session.store_id !== storeId) {
      throw new ForbiddenException('Sesi ini bukan milik toko kamu');
    }

    // Managers and owners can close any session; cashier can only close their own
    const isManagerOrAbove = ['owner', 'manager'].includes(user.role ?? '');
    if (!isManagerOrAbove && session.cashier_id !== cashierId) {
      throw new ForbiddenException('Kasir hanya bisa menutup sesi sendiri');
    }

    // Read setting: requireClosingCash
    const requireClosingCash = await this.stores.getSetting(
      'requireClosingCash',
      'false',
      storeId,
    );

    if (requireClosingCash === 'true' && dto.closingCash == null) {
      throw new BadRequestException(
        'Nominal kas akhir wajib diisi (pengaturan requireClosingCash aktif)',
      );
    }

    const countedCash = dto.closingCash ?? 0;
    const variance = countedCash - session.expected_cash;

    const updated = await this.prisma.cash_register_sessions.update({
      where: { id: sessionId },
      data: {
        status: RegisterSessionStatus.CLOSED,
        counted_cash: countedCash,
        variance,
        notes: dto.notes ?? session.notes,
        closed_at: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Session #${sessionId} closed by ${cashierId} — counted: ${countedCash}, variance: ${variance}`,
    );

    return this.mapSession(updated);
  }

  // ── Get current session ───────────────────────────────────────────────────

  async getCurrentSession(user: AuthUser): Promise<SessionSummary | null> {
    const storeId = user.storeId ?? 'default-store';
    const cashierId = user.actor ?? user.email;

    const session = await this.prisma.cash_register_sessions.findFirst({
      where: {
        cashier_id: cashierId,
        store_id: storeId,
        status: RegisterSessionStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });

    return session ? this.mapSession(session) : null;
  }

  // ── List sessions (for manager/owner) ────────────────────────────────────

  async listSessions(
    user: AuthUser,
    opts: { limit?: number; status?: string } = {},
  ): Promise<SessionSummary[]> {
    const storeId = user.storeId ?? 'default-store';

    const rows = await this.prisma.cash_register_sessions.findMany({
      where: {
        store_id: storeId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      orderBy: { id: 'desc' },
      take: opts.limit ?? 50,
    });

    return rows.map((r) => this.mapSession(r));
  }

  // ── Payment method guard (reads store setting) ────────────────────────────

  /**
   * Validates that each payment method in the sale is in the
   * store's kasirPaymentMethods setting. If the setting is not
   * configured, all methods are allowed (fail-open for backward compat).
   */
  async validatePaymentMethods(
    methods: string[],
    storeId: string,
  ): Promise<void> {
    const raw = await this.stores.getSetting(
      'kasirPaymentMethods',
      '',
      storeId,
    );

    if (!raw.trim()) return; // setting not configured → allow all

    const allowed = raw.split(',').map((m) => m.trim().toLowerCase());

    for (const method of methods) {
      if (!allowed.includes(method.toLowerCase())) {
        throw new BadRequestException(
          `Metode pembayaran "${method}" tidak diizinkan di kasir ini. Diizinkan: ${allowed.join(', ')}`,
        );
      }
    }
  }
}
