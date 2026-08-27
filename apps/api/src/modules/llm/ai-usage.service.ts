import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  DEFAULT_STORE_TIER,
  STORE_TIERS,
  StoreTier,
  TIER_LIMITS,
} from '@libs/contracts/src/enums';

export type AiQuotaType = 'owner_assistant' | 'customer_service';

export interface AiQuotaResult {
  allowed: boolean;
  dailyCount: number;
  dailyLimit: number;
  monthlyCount: number;
  monthlyLimit: number;
}

/**
 * AI chat quota — daily + monthly caps per store, per TIER_LIMITS. A rejected
 * check must not consume quota, so this always reads both counters first and
 * only increments once both checks pass (see checkAndIncrement).
 *
 * Only the Owner Assistant endpoint (llm.controller.ts) calls this today —
 * see the ai_usage_counters model comment in schema.prisma for why the
 * WhatsApp Customer Service bot can't be metered per-store yet.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(
    storeId: string,
    quotaType: AiQuotaType,
  ): Promise<AiQuotaResult> {
    const tier = await this.getStoreTier(storeId);
    const limits =
      quotaType === 'owner_assistant'
        ? TIER_LIMITS[tier].aiOwnerAssistant
        : TIER_LIMITS[tier].aiCustomerService;

    const now = new Date();
    const dailyPeriod = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const monthlyPeriod = now.toISOString().slice(0, 7); // YYYY-MM

    const [dailyCount, monthlyCount] = await Promise.all([
      this.getCount(storeId, quotaType, dailyPeriod),
      this.getCount(storeId, quotaType, monthlyPeriod),
    ]);

    const allowed = dailyCount < limits.perDay && monthlyCount < limits.perMonth;

    if (allowed) {
      const updatedAt = now.toISOString();
      await Promise.all([
        this.increment(storeId, quotaType, dailyPeriod, updatedAt),
        this.increment(storeId, quotaType, monthlyPeriod, updatedAt),
      ]);
    } else {
      this.logger.warn(
        `AI quota exceeded: store=${storeId} type=${quotaType} tier=${tier} daily=${dailyCount}/${limits.perDay} monthly=${monthlyCount}/${limits.perMonth}`,
      );
    }

    return {
      allowed,
      dailyCount: allowed ? dailyCount + 1 : dailyCount,
      dailyLimit: limits.perDay,
      monthlyCount: allowed ? monthlyCount + 1 : monthlyCount,
      monthlyLimit: limits.perMonth,
    };
  }

  private async getCount(
    storeId: string,
    quotaType: AiQuotaType,
    period: string,
  ): Promise<number> {
    const row = await (this.prisma as any).ai_usage_counters.findUnique({
      where: {
        store_id_quota_type_period: {
          store_id: storeId,
          quota_type: quotaType,
          period,
        },
      },
    });
    return row?.count ?? 0;
  }

  private async increment(
    storeId: string,
    quotaType: AiQuotaType,
    period: string,
    updatedAt: string,
  ): Promise<void> {
    await (this.prisma as any).ai_usage_counters.upsert({
      where: {
        store_id_quota_type_period: {
          store_id: storeId,
          quota_type: quotaType,
          period,
        },
      },
      update: { count: { increment: 1 }, updated_at: updatedAt },
      create: {
        store_id: storeId,
        quota_type: quotaType,
        period,
        count: 1,
        updated_at: updatedAt,
      },
    });
  }

  /**
   * Duplicated from StoresService#getStoreTier — see the same note in
   * auth.service.ts#getStoreTierForLimitCheck. Keep all three in sync.
   */
  private async getStoreTier(storeId: string): Promise<StoreTier> {
    const rows = await this.prisma.$queryRawUnsafe<{ tier: string }[]>(
      `SELECT tier FROM stores WHERE id = ? LIMIT 1`,
      storeId,
    );
    const tier = rows?.[0]?.tier;
    return (STORE_TIERS as string[]).includes(tier ?? '')
      ? (tier as StoreTier)
      : DEFAULT_STORE_TIER;
  }
}
