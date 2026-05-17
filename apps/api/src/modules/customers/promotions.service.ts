// apps/api/src/modules/customers/promotions.service.ts
//
// PromotionsService — manage promotions and vouchers, apply discounts.
//
// Design rules:
//   • applyPromotion() is the single entry point for discount calculation.
//   • Promotions are validated against: status=active, date window, usage limit.
//   • Vouchers are validated against: status=active, usage limit, expiry, min order.
//   • applyPromotion() returns the discount amount — does NOT mutate the sale.
//   • recordUsage() is called AFTER the sale commits to increment usage_count.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

// ── Promo type constants ──────────────────────────────────────────────────────
export const PromoType = {
  ORDER_DISCOUNT: 'order_discount',
  ITEM_DISCOUNT: 'item_discount',
  BUNDLE: 'bundle',
  BUY_X_GET_Y: 'buy_x_get_y',
  HAPPY_HOUR: 'happy_hour',
} as const;

export const DiscountType = {
  PERCENT: 'percent',
  AMOUNT: 'amount',
} as const;

export const PromoStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired',
} as const;

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreatePromotionDto {
  name: string;
  description?: string;
  promoType?: string;
  discountType?: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  storeId?: string;
}

export interface CreateVoucherDto {
  code: string;
  promotionId?: number;
  discountType?: string;
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  customerId?: number;
  expiresAt?: string;
  storeId?: string;
}

export interface ApplyDiscountResult {
  discountAmount: number;
  promotionId: number | null;
  voucherCode: string | null;
  description: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Promotion CRUD ─────────────────────────────────────────────────────────

  async listPromotions(storeId = 'default-store', status?: string) {
    return this.prisma.promotions.findMany({
      where: {
        store_id: storeId,
        ...(status ? { status } : {}),
      },
      include: { rules: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPromotionById(id: number) {
    return this.prisma.promotions.findUnique({
      where: { id },
      include: { rules: true },
    });
  }

  async createPromotion(dto: CreatePromotionDto) {
    const storeId = dto.storeId ?? 'default-store';
    const now = new Date().toISOString();
    return this.prisma.promotions.create({
      data: {
        store_id: storeId,
        name: dto.name,
        description: dto.description ?? null,
        promo_type: dto.promoType ?? PromoType.ORDER_DISCOUNT,
        discount_type: dto.discountType ?? DiscountType.PERCENT,
        discount_value: dto.discountValue,
        min_order_amount: dto.minOrderAmount ?? 0,
        max_discount_amount: dto.maxDiscountAmount ?? null,
        status: PromoStatus.DRAFT,
        starts_at: dto.startsAt ?? null,
        ends_at: dto.endsAt ?? null,
        usage_limit: dto.usageLimit ?? null,
        updated_at: now,
      },
      include: { rules: true },
    });
  }

  async activatePromotion(id: number) {
    const promo = await this.prisma.promotions.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    return this.prisma.promotions.update({
      where: { id },
      data: {
        status: PromoStatus.ACTIVE,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async pausePromotion(id: number) {
    return this.prisma.promotions.update({
      where: { id },
      data: {
        status: PromoStatus.PAUSED,
        updated_at: new Date().toISOString(),
      },
    });
  }

  // ── Voucher CRUD ───────────────────────────────────────────────────────────

  async listVouchers(storeId = 'default-store', status?: string) {
    return this.prisma.vouchers.findMany({
      where: {
        store_id: storeId,
        ...(status ? { status } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getVoucherByCode(code: string, storeId = 'default-store') {
    return this.prisma.vouchers.findFirst({
      where: { code: code.toUpperCase().trim(), store_id: storeId },
    });
  }

  async createVoucher(dto: CreateVoucherDto) {
    const storeId = dto.storeId ?? 'default-store';
    const code = (dto.code || '').toUpperCase().trim();
    if (!code) throw new BadRequestException('Voucher code is required');

    const existing = await this.prisma.vouchers.findFirst({
      where: { code, store_id: storeId },
    });
    if (existing)
      throw new BadRequestException(`Voucher code "${code}" already exists`);

    const now = new Date().toISOString();
    return this.prisma.vouchers.create({
      data: {
        store_id: storeId,
        code,
        promotion_id: dto.promotionId ?? null,
        discount_type: dto.discountType ?? DiscountType.PERCENT,
        discount_value: dto.discountValue ?? 0,
        min_order_amount: dto.minOrderAmount ?? 0,
        max_discount_amount: dto.maxDiscountAmount ?? null,
        usage_limit: dto.usageLimit ?? 1,
        customer_id: dto.customerId ?? null,
        expires_at: dto.expiresAt ?? null,
        updated_at: now,
      },
    });
  }

  // ── Apply discount ─────────────────────────────────────────────────────────

  /**
   * Calculate discount for a given order total.
   * Checks active promotions first, then voucher code if provided.
   * Returns the discount amount and metadata — does NOT mutate any rows.
   * Call recordUsage() after the sale commits.
   */
  async calculateDiscount(
    orderTotal: number,
    storeId = 'default-store',
    voucherCode?: string,
  ): Promise<ApplyDiscountResult> {
    const now = new Date().toISOString();

    // ── Voucher path ──────────────────────────────────────────────────────────
    if (voucherCode) {
      const voucher = await this.getVoucherByCode(voucherCode, storeId);
      if (!voucher)
        throw new NotFoundException(`Voucher "${voucherCode}" not found`);
      if (voucher.status !== 'active')
        throw new BadRequestException(
          `Voucher "${voucherCode}" is ${voucher.status}`,
        );
      if (voucher.expires_at && voucher.expires_at < now)
        throw new BadRequestException(`Voucher "${voucherCode}" has expired`);
      if (
        voucher.usage_limit > 0 &&
        voucher.usage_count >= voucher.usage_limit
      ) {
        throw new BadRequestException(
          `Voucher "${voucherCode}" has reached its usage limit`,
        );
      }
      if (orderTotal < voucher.min_order_amount) {
        throw new BadRequestException(
          `Minimum order for this voucher is Rp${voucher.min_order_amount.toLocaleString('id-ID')}`,
        );
      }

      const discount = this.computeDiscount(
        orderTotal,
        voucher.discount_type,
        voucher.discount_value,
        voucher.max_discount_amount,
      );

      return {
        discountAmount: discount,
        promotionId: voucher.promotion_id,
        voucherCode: voucher.code,
        description: `Voucher ${voucher.code}: ${this.discountLabel(voucher.discount_type, voucher.discount_value)}`,
      };
    }

    // ── Active promotion path ─────────────────────────────────────────────────
    const activePromos = await this.prisma.promotions.findMany({
      where: {
        store_id: storeId,
        status: PromoStatus.ACTIVE,
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
      },
      orderBy: { discount_value: 'desc' },
    });

    for (const promo of activePromos) {
      if (promo.ends_at && promo.ends_at < now) continue;
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) continue;
      if (orderTotal < promo.min_order_amount) continue;

      const discount = this.computeDiscount(
        orderTotal,
        promo.discount_type,
        promo.discount_value,
        promo.max_discount_amount,
      );

      return {
        discountAmount: discount,
        promotionId: promo.id,
        voucherCode: null,
        description: `${promo.name}: ${this.discountLabel(promo.discount_type, promo.discount_value)}`,
      };
    }

    return {
      discountAmount: 0,
      promotionId: null,
      voucherCode: null,
      description: '',
    };
  }

  /** Record usage after a sale commits. Call outside the sale transaction. */
  async recordUsage(
    promotionId?: number | null,
    voucherCode?: string | null,
    storeId = 'default-store',
  ) {
    const now = new Date().toISOString();
    if (promotionId) {
      await this.prisma.promotions.update({
        where: { id: promotionId },
        data: { usage_count: { increment: 1 }, updated_at: now },
      });
    }
    if (voucherCode) {
      const voucher = await this.getVoucherByCode(voucherCode, storeId);
      if (voucher) {
        const newCount = voucher.usage_count + 1;
        const newStatus =
          voucher.usage_limit > 0 && newCount >= voucher.usage_limit
            ? 'used'
            : 'active';
        await this.prisma.vouchers.update({
          where: { id: voucher.id },
          data: { usage_count: newCount, status: newStatus, updated_at: now },
        });
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private computeDiscount(
    orderTotal: number,
    discountType: string,
    discountValue: number,
    maxDiscount: number | null,
  ): number {
    let discount =
      discountType === DiscountType.PERCENT
        ? Math.floor(orderTotal * (discountValue / 100))
        : Math.floor(discountValue);

    if (maxDiscount != null && discount > maxDiscount)
      discount = Math.floor(maxDiscount);
    if (discount > orderTotal) discount = orderTotal;
    return Math.max(0, discount);
  }

  private discountLabel(discountType: string, discountValue: number): string {
    return discountType === DiscountType.PERCENT
      ? `${discountValue}% off`
      : `Rp${discountValue.toLocaleString('id-ID')} off`;
  }
}
