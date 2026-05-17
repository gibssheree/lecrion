// apps/api/src/modules/customers/loyalty.service.ts
//
// LoyaltyService — earn/redeem points, manage loyalty programs.
//
// Design rules:
//   • Points are earned AFTER a sale commits (not inside the sale tx).
//   • Points ledger is append-only (customer_points table).
//   • Balance is computed from the ledger (sum of points column).
//   • Redeem creates a negative entry and returns the IDR discount value.
//   • Only one active loyalty program per store at a time.
//   • Tier upgrades are computed from total spend (not points).

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { CustomerTier } from './customers.service';

// ── Tier thresholds (total spend in IDR) ─────────────────────────────────────
const TIER_THRESHOLDS = {
  platinum: 10_000_000,
  gold: 5_000_000,
  silver: 1_000_000,
  regular: 0,
} as const;

function computeTier(totalSpend: number): string {
  if (totalSpend >= TIER_THRESHOLDS.platinum) return CustomerTier.PLATINUM;
  if (totalSpend >= TIER_THRESHOLDS.gold) return CustomerTier.GOLD;
  if (totalSpend >= TIER_THRESHOLDS.silver) return CustomerTier.SILVER;
  return CustomerTier.REGULAR;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface EarnPointsDto {
  customerId: number;
  saleTotal: number;
  saleId: number | string;
  storeId?: string;
}

export interface RedeemPointsDto {
  customerId: number;
  pointsToRedeem: number;
  saleId?: number | string;
  storeId?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Program management ─────────────────────────────────────────────────────

  async getActiveProgram(storeId = 'default-store') {
    return this.prisma.loyalty_programs.findFirst({
      where: { store_id: storeId, is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async createProgram(data: {
    name: string;
    description?: string;
    earnRate?: number;
    redeemRate?: number;
    minRedeemPoints?: number;
    pointsExpiryDays?: number;
    storeId?: string;
  }) {
    const storeId = data.storeId ?? 'default-store';
    const now = new Date().toISOString();

    // Deactivate existing programs
    await this.prisma.loyalty_programs.updateMany({
      where: { store_id: storeId, is_active: true },
      data: { is_active: false, updated_at: now },
    });

    return this.prisma.loyalty_programs.create({
      data: {
        store_id: storeId,
        name: data.name,
        description: data.description ?? null,
        earn_rate: data.earnRate ?? 0.01,
        redeem_rate: data.redeemRate ?? 1.0,
        min_redeem_points: data.minRedeemPoints ?? 100,
        points_expiry_days: data.pointsExpiryDays ?? null,
        updated_at: now,
      },
    });
  }

  // ── Balance ────────────────────────────────────────────────────────────────

  async getBalance(
    customerId: number,
    storeId = 'default-store',
  ): Promise<number> {
    const result = await this.prisma.customer_points.aggregate({
      where: { customer_id: customerId, store_id: storeId },
      _sum: { points: true },
    });
    return result._sum.points ?? 0;
  }

  async getPointHistory(
    customerId: number,
    storeId = 'default-store',
    limit = 20,
  ) {
    return this.prisma.customer_points.findMany({
      where: { customer_id: customerId, store_id: storeId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // ── Earn points after a sale ───────────────────────────────────────────────

  async earnPoints(
    dto: EarnPointsDto,
  ): Promise<{ pointsEarned: number; newBalance: number }> {
    const storeId = dto.storeId ?? 'default-store';
    const program = await this.getActiveProgram(storeId);
    if (!program) return { pointsEarned: 0, newBalance: 0 };

    const pointsEarned = Math.floor(dto.saleTotal * program.earn_rate);
    if (pointsEarned <= 0)
      return {
        pointsEarned: 0,
        newBalance: await this.getBalance(dto.customerId, storeId),
      };

    const currentBalance = await this.getBalance(dto.customerId, storeId);
    const newBalance = currentBalance + pointsEarned;

    const expiresAt = program.points_expiry_days
      ? new Date(
          Date.now() + program.points_expiry_days * 86400000,
        ).toISOString()
      : null;

    await this.prisma.customer_points.create({
      data: {
        customer_id: dto.customerId,
        store_id: storeId,
        entry_type: 'earn',
        points: pointsEarned,
        balance_after: newBalance,
        reference_type: 'pos_sale',
        reference_id: String(dto.saleId),
        note: `Earned from sale #${dto.saleId}`,
        expires_at: expiresAt,
      },
    });

    // Update customer tier based on total spend
    await this.updateCustomerTier(dto.customerId, storeId);

    return { pointsEarned, newBalance };
  }

  // ── Redeem points ──────────────────────────────────────────────────────────

  async redeemPoints(
    dto: RedeemPointsDto,
  ): Promise<{ discountAmount: number; newBalance: number }> {
    const storeId = dto.storeId ?? 'default-store';
    const program = await this.getActiveProgram(storeId);
    if (!program) throw new BadRequestException('No active loyalty program');

    if (dto.pointsToRedeem < program.min_redeem_points) {
      throw new BadRequestException(
        `Minimum redeem is ${program.min_redeem_points} points. You requested ${dto.pointsToRedeem}.`,
      );
    }

    const currentBalance = await this.getBalance(dto.customerId, storeId);
    if (currentBalance < dto.pointsToRedeem) {
      throw new BadRequestException(
        `Insufficient points. Balance: ${currentBalance}, requested: ${dto.pointsToRedeem}.`,
      );
    }

    const discountAmount = Math.floor(dto.pointsToRedeem * program.redeem_rate);
    const newBalance = currentBalance - dto.pointsToRedeem;

    await this.prisma.customer_points.create({
      data: {
        customer_id: dto.customerId,
        store_id: storeId,
        entry_type: 'redeem',
        points: -dto.pointsToRedeem,
        balance_after: newBalance,
        reference_type: dto.saleId ? 'pos_sale' : 'manual',
        reference_id: dto.saleId ? String(dto.saleId) : null,
        note: `Redeemed ${dto.pointsToRedeem} points for Rp${discountAmount.toLocaleString('id-ID')} discount`,
      },
    });

    return { discountAmount, newBalance };
  }

  // ── Manual adjustment ──────────────────────────────────────────────────────

  async adjustPoints(
    customerId: number,
    points: number,
    note: string,
    storeId = 'default-store',
  ) {
    const currentBalance = await this.getBalance(customerId, storeId);
    const newBalance = currentBalance + points;
    if (newBalance < 0)
      throw new BadRequestException(
        'Adjustment would result in negative balance',
      );

    await this.prisma.customer_points.create({
      data: {
        customer_id: customerId,
        store_id: storeId,
        entry_type: 'adjust',
        points,
        balance_after: newBalance,
        reference_type: 'manual',
        note,
      },
    });
    return { newBalance };
  }

  // ── Tier update ────────────────────────────────────────────────────────────

  private async updateCustomerTier(customerId: number, storeId: string) {
    const result = await this.prisma.pos_sales.aggregate({
      where: { customer_id: customerId, store_id: storeId, status: 'paid' },
      _sum: { total: true },
    });
    const totalSpend = result._sum.total ?? 0;
    const newTier = computeTier(totalSpend);

    await this.prisma.customers.update({
      where: { id: customerId },
      data: { tier: newTier, updated_at: new Date().toISOString() },
    });
  }
}
