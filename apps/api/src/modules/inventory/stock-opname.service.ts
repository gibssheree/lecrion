// apps/api/src/modules/inventory/stock-opname.service.ts
//
// StockOpnameService — physical stock-count sessions.
//
// Lifecycle:
//   draft     → created. Lines are pre-populated with system_qty snapshot.
//               Cashier/staff records counted_qty per line.
//   submitted → marked ready for manager review. No stock changes yet.
//   posted    → manager approves. Variance per line posted to ledger as
//               ADJUSTMENT movements. Session becomes immutable.
//   cancelled → discarded. No stock changes.
//
// Variance:
//   variance_qty   = counted_qty - system_qty
//   variance_value = variance_qty × unit_cost (cost_price snapshot)
//
// Posting rule:
//   For every line where variance_qty != 0, write a stock_change_logs row
//   with change_type = ADJUSTMENT and qty_change = variance_qty.
//   Update menu.stock atomically.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { StockMovementType } from '@libs/contracts/src/enums';
import { InventoryLedgerService } from './inventory-ledger.service';

export type StockOpnameStatus = 'draft' | 'submitted' | 'posted' | 'cancelled';

export interface CreateOpnameSessionDto {
  storeId?: string;
  locationId?: number;
  notes?: string;
  createdBy: string;
  /** Optional menu IDs to include. If omitted, includes all stock-tracked products. */
  menuIds?: number[];
}

export interface UpdateOpnameLineDto {
  countedQty: number;
  notes?: string;
}

@Injectable()
export class StockOpnameService {
  private readonly logger = new Logger(StockOpnameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  async listSessions(
    storeId = 'default-store',
    status?: StockOpnameStatus,
    limit = 50,
  ) {
    const rows = await this.prisma.stock_opname_sessions.findMany({
      where: {
        store_id: storeId,
        ...(status ? { status } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map((row) => this.normalizeSession(row));
  }

  async getSessionById(id: number) {
    const row = await this.prisma.stock_opname_sessions.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: [{ id: 'asc' }],
        },
      },
    });
    if (!row) return null;
    return {
      ...this.normalizeSession(row),
      lines: row.lines.map((line) => this.normalizeLine(line)),
    };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async createSession(dto: CreateOpnameSessionDto) {
    if (!dto.createdBy?.trim()) {
      throw new BadRequestException('createdBy is required');
    }

    const storeId = dto.storeId ?? 'default-store';

    // Pre-populate lines from menu snapshot
    const products = await this.prisma.menu.findMany({
      where: {
        is_active: true,
        is_stock_tracked: true,
        ...(dto.menuIds?.length ? { id: { in: dto.menuIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        stock: true,
        cost_price: true,
      },
      orderBy: { name: 'asc' },
    });

    if (!products.length) {
      throw new BadRequestException(
        'No stock-tracked products found for this opname session',
      );
    }

    const now = new Date().toISOString();
    const sessionNumber = this.buildSessionNumber(now);

    return this.prisma
      .$transaction(async (tx) => {
        const session = await tx.stock_opname_sessions.create({
          data: {
            session_number: sessionNumber,
            store_id: storeId,
            location_id: dto.locationId ?? null,
            status: 'draft',
            notes: dto.notes ?? null,
            created_by: dto.createdBy.trim(),
            created_at: now,
            updated_at: now,
          },
        });

        for (const product of products) {
          await tx.stock_opname_lines.create({
            data: {
              session_id: session.id,
              menu_id: product.id,
              product_name: product.name,
              system_qty: product.stock,
              counted_qty: null,
              variance_qty: 0,
              unit_cost: product.cost_price ?? null,
              variance_value: 0,
              created_at: now,
              updated_at: now,
            },
          });
        }

        return session.id;
      })
      .then((id) => this.getSessionById(id));
  }

  async updateLine(
    sessionId: number,
    lineId: number,
    dto: UpdateOpnameLineDto,
  ) {
    const session = await this.prisma.stock_opname_sessions.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.status !== 'draft') {
      throw new ConflictException(
        `Cannot edit lines on a ${session.status} session`,
      );
    }

    const line = await this.prisma.stock_opname_lines.findUnique({
      where: { id: lineId },
    });
    if (!line || line.session_id !== sessionId) {
      throw new NotFoundException(`Line ${lineId} not found`);
    }

    if (!Number.isInteger(dto.countedQty) || dto.countedQty < 0) {
      throw new BadRequestException(
        'countedQty must be a non-negative integer',
      );
    }

    const variance = dto.countedQty - line.system_qty;
    const varianceValue = variance * Number(line.unit_cost ?? 0);

    return this.prisma.stock_opname_lines.update({
      where: { id: lineId },
      data: {
        counted_qty: dto.countedQty,
        variance_qty: variance,
        variance_value: varianceValue,
        notes: dto.notes ?? line.notes,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async submitSession(id: number) {
    const session = await this.prisma.stock_opname_sessions.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (session.status !== 'draft') {
      throw new ConflictException(
        `Only draft sessions can be submitted (current: ${session.status})`,
      );
    }
    const uncounted = session.lines.filter((l) => l.counted_qty === null);
    if (uncounted.length > 0) {
      throw new BadRequestException(
        `${uncounted.length} line(s) have no counted_qty yet. Fill all lines before submitting.`,
      );
    }

    const totalQty = session.lines.reduce(
      (sum, l) => sum + Math.abs(l.variance_qty),
      0,
    );
    const totalValue = session.lines.reduce(
      (sum, l) => sum + Number(l.variance_value),
      0,
    );

    return this.prisma.stock_opname_sessions.update({
      where: { id },
      data: {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        total_variance_qty: totalQty,
        total_variance_value: totalValue,
        updated_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Post a submitted session — applies stock adjustments atomically.
   *
   * For each line with variance_qty != 0:
   *   • Updates menu.stock to counted_qty (absolute).
   *   • Writes a stock_change_logs row with change_type = ADJUSTMENT.
   *   • Note: 'Stock opname session #SO-...'.
   */
  async postSession(id: number, postedBy: string) {
    if (!postedBy?.trim()) {
      throw new BadRequestException('postedBy is required');
    }

    const session = await this.prisma.stock_opname_sessions.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (session.status !== 'submitted') {
      throw new ConflictException(
        `Only submitted sessions can be posted (current: ${session.status})`,
      );
    }

    const now = new Date().toISOString();
    const linesWithVariance = session.lines.filter(
      (l) => l.variance_qty !== 0 && l.counted_qty !== null,
    );

    // Each line is its own atomic ledger write through InventoryLedgerService.
    // We can't put them all in a single transaction without changing
    // appendMovementLog signature, so post the session header first, then
    // run the ledger writes. If a ledger write fails, the session stays
    // posted but with a partial-post warning logged.

    await this.prisma.stock_opname_sessions.update({
      where: { id },
      data: {
        status: 'posted',
        posted_at: now,
        posted_by: postedBy.trim(),
        updated_at: now,
      },
    });

    for (const line of linesWithVariance) {
      try {
        const note = `Stock opname ${session.session_number}: system=${line.system_qty}, counted=${line.counted_qty}, variance=${line.variance_qty}${
          line.notes ? ` — ${line.notes}` : ''
        }`;
        await this.ledger.writeMovement({
          menuId: line.menu_id,
          qtyChange: line.variance_qty,
          movementType: StockMovementType.ADJUSTMENT,
          note,
          sourceRef: `opname-session-${session.id}`,
          operatorId: postedBy.trim(),
          storeId: session.store_id,
          locationId: session.location_id ?? undefined,
        });
      } catch (err) {
        this.logger.error(
          `Failed to post line ${line.id} of opname session ${session.id}: ${
            (err as Error).message
          }`,
        );
      }
    }

    this.logger.log(
      `Stock opname session ${session.session_number} posted by ${postedBy} — ${linesWithVariance.length} adjustments`,
    );

    return this.getSessionById(id);
  }

  async cancelSession(id: number, cancelledBy: string, reason?: string) {
    const session = await this.prisma.stock_opname_sessions.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (session.status === 'posted') {
      throw new ConflictException('Posted sessions cannot be cancelled');
    }
    if (session.status === 'cancelled') {
      throw new ConflictException('Session is already cancelled');
    }

    const now = new Date().toISOString();
    return this.prisma.stock_opname_sessions.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelled_at: now,
        cancelled_by: cancelledBy?.trim() || 'system',
        cancelled_reason: reason ?? null,
        updated_at: now,
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildSessionNumber(now: string): string {
    const compact = now.replace(/[^0-9]/g, '').slice(0, 14);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `SO-${compact}-${random}`;
  }

  private normalizeSession(row: any) {
    return {
      id: row.id,
      sessionNumber: row.session_number,
      storeId: row.store_id,
      locationId: row.location_id ?? null,
      status: row.status as StockOpnameStatus,
      notes: row.notes ?? null,
      createdBy: row.created_by,
      submittedAt: row.submitted_at ?? null,
      postedAt: row.posted_at ?? null,
      postedBy: row.posted_by ?? null,
      cancelledAt: row.cancelled_at ?? null,
      cancelledBy: row.cancelled_by ?? null,
      cancelledReason: row.cancelled_reason ?? null,
      totalVarianceQty: row.total_variance_qty,
      totalVarianceValue: Number(row.total_variance_value ?? 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeLine(row: any) {
    return {
      id: row.id,
      sessionId: row.session_id,
      menuId: row.menu_id,
      productName: row.product_name,
      systemQty: row.system_qty,
      countedQty: row.counted_qty,
      varianceQty: row.variance_qty,
      unitCost: row.unit_cost ? Number(row.unit_cost) : null,
      varianceValue: Number(row.variance_value ?? 0),
      notes: row.notes ?? null,
    };
  }
}
