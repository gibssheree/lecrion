// apps/api/src/modules/aggregator/aggregator.service.ts
//
// Order Aggregator Service — Phase 2 Implementation
//
// Responsibilities:
//   1. Receive normalized aggregator order payloads
//   2. Deduplicate via webhook_dedupes table
//   3. Look up products by name (fuzzy match against menu table)
//   4. Create an `orders` row with type = channel ('gofood' | 'grabfood' | 'shopeefood')
//   5. Emit realtime event to POS Cashier (new order bell) and KDS (kitchen display)
//   6. Write audit log for traceability

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import {
  AggregatorChannel,
  AggregatorOrderItem,
  NormalizedAggregatorOrder,
} from './aggregator.types';
import { ORDER_EVENTS } from '@libs/contracts/src/events';

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
    private readonly config: AppConfigService,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Ingest a normalized aggregator order into the Lecrion system.
   * Returns the created order ID on success.
   * Throws ConflictException if already processed (idempotency).
   */
  async ingestOrder(order: NormalizedAggregatorOrder): Promise<{ orderId: number; receiptMessage: string }> {
    this.logger.log(
      `[${order.channel.toUpperCase()}] Incoming order ${order.externalOrderId} — ${order.items.length} item(s)`,
    );

    // ── 1. Deduplication ───────────────────────────────────────────────────
    const dedupeKey = `agg:${order.channel}:${order.externalOrderId}`;
    const existing = await this.prisma.webhook_dedupes.findUnique({
      where: { dedupe_key: dedupeKey },
    });
    if (existing) {
      throw new ConflictException(
        `Order ${order.externalOrderId} from ${order.channel} already processed`,
      );
    }

    // ── 2. Resolve menu items ──────────────────────────────────────────────
    const resolvedItems = await this.resolveMenuItems(order.items, order.channel);

    if (resolvedItems.length === 0) {
      throw new BadRequestException(
        `No matching menu items found for order ${order.externalOrderId}`,
      );
    }

    const total = resolvedItems.reduce(
      (sum, i) => sum + i.resolvedPrice * i.qty,
      0,
    );

    // ── 3. System user for aggregator orders ──────────────────────────────
    // Use a dedicated system user (id=1, the first owner) for aggregator-
    // created orders. In production this could be a dedicated service account.
    const systemUserId = await this.getSystemUserId();

    // ── 4. Create order + items + dedup row in one transaction ────────────
    const { orderId } = await this.prisma.$transaction(async (tx) => {
      // Write dedup row first so concurrent webhooks bounce
      await tx.webhook_dedupes.create({
        data: {
          dedupe_key: dedupeKey,
          created_at: new Date().toISOString(),
        },
      });

      // Create the order
      const created = await tx.orders.create({
        data: {
          user_id: systemUserId,
          type: order.channel,                  // 'gofood' | 'grabfood' | 'shopeefood'
          name: order.customerName || 'Customer Aggregator',
          phone: order.customerPhone ?? '',
          address: order.deliveryAddress ?? '',
          payment_method: 'aggregator',
          status: 'pending',
          estimated_time: order.estimatedPrepMinutes ?? 20,
          created_at: new Date().toISOString(),
          // Aggregator routing is single-tenant today, same as the bot (SEC-05).
          store_id: this.config.defaultStoreId,
        },
      });

      // Create order items
      await tx.order_items.createMany({
        data: resolvedItems.map((i) => ({
          order_id: created.id,
          menu_id: i.menuId,
          name: i.name,
          price: i.resolvedPrice,
          qty: i.qty,
        })),
      });

      // Write outbox event for downstream consumers (worker, bot notifications)
      await this.sync.writeOutboxInTx(
        tx,
        ORDER_EVENTS.CREATED,
        {
          orderId: created.id,
          channel: order.channel,
          externalOrderId: order.externalOrderId,
          customerName: order.customerName,
          total,
          itemCount: resolvedItems.length,
        },
        { source: `aggregator:${order.channel}` },
      );

      return { orderId: created.id };
    });

    // ── 5. Post-transaction realtime push ──────────────────────────────────
    this.realtime.emit('aggregator:new_order', {
      orderId,
      channel: order.channel,
      externalOrderId: order.externalOrderId,
      customerName: order.customerName,
      total,
      itemCount: resolvedItems.length,
      estimatedPrepMinutes: order.estimatedPrepMinutes ?? 20,
    });

    // ── 6. Audit log ───────────────────────────────────────────────────────
    this.audit.record({
      actor: `aggregator:${order.channel}`,
      action: ORDER_EVENTS.CREATED,
      resource: 'orders',
      resourceId: orderId,
      after: {
        channel: order.channel,
        externalOrderId: order.externalOrderId,
        total,
      },
      channel: 'aggregator',
    });

    const channelLabel = this.channelLabel(order.channel);
    const receiptMessage =
      `✅ Pesanan ${channelLabel} #${order.externalOrderId} berhasil masuk.\n` +
      `Order ID: #${orderId} | Total: Rp${total.toLocaleString('id-ID')} | ` +
      `${resolvedItems.length} item`;

    this.logger.log(
      `[${order.channel.toUpperCase()}] Order created: #${orderId} — Rp${total.toLocaleString('id-ID')}`,
    );

    return { orderId, receiptMessage };
  }

  // ── Normalizers (platform-specific → NormalizedAggregatorOrder) ───────────

  /** Normalize a GoFood webhook payload into the canonical form. */
  normalizeGoFood(raw: any): NormalizedAggregatorOrder {
    return {
      externalOrderId: String(raw?.order_id ?? ''),
      channel: 'gofood',
      customerName: raw?.customer_name ?? 'GoFood Customer',
      customerPhone: raw?.customer_phone,
      deliveryAddress: raw?.delivery_address,
      items: (raw?.order_items ?? []).map((i: any) => ({
        externalId: String(i.item_id ?? ''),
        name: String(i.item_name ?? ''),
        qty: Number(i.quantity ?? 1),
        unitPrice: Number(i.price ?? 0),
        notes: i.notes,
      })),
      platformTotal: Number(raw?.total_price ?? 0),
      estimatedPrepMinutes: raw?.estimated_time,
      rawPayload: JSON.stringify(raw),
    };
  }

  /** Normalize a GrabFood webhook payload into the canonical form. */
  normalizeGrabFood(raw: any): NormalizedAggregatorOrder {
    return {
      externalOrderId: String(raw?.orderID ?? ''),
      channel: 'grabfood',
      customerName: raw?.buyer?.name ?? 'GrabFood Customer',
      customerPhone: raw?.buyer?.phone,
      deliveryAddress: raw?.deliveryInfo?.address,
      items: (raw?.cartItems ?? []).map((i: any) => ({
        externalId: String(i.itemID ?? ''),
        name: String(i.name ?? ''),
        qty: Number(i.quantity ?? 1),
        unitPrice: Number(i.price?.amount ?? 0),
        notes: i.specialRequests,
      })),
      platformTotal: Number(raw?.payment?.amount ?? 0),
      estimatedPrepMinutes: raw?.prepDuration,
      rawPayload: JSON.stringify(raw),
    };
  }

  /** Normalize a ShopeeFood webhook payload into the canonical form. */
  normalizeShopeeFood(raw: any): NormalizedAggregatorOrder {
    return {
      externalOrderId: String(raw?.order_sn ?? ''),
      channel: 'shopeefood',
      customerName: raw?.buyer_username ?? 'ShopeeFood Customer',
      customerPhone: raw?.buyer_phone,
      deliveryAddress: raw?.shipping_address?.full_address,
      items: (raw?.item_list ?? []).map((i: any) => ({
        externalId: String(i.item_id ?? ''),
        name: String(i.item_name ?? ''),
        qty: Number(i.amount ?? 1),
        unitPrice: Number(i.item_price ?? 0),
        notes: i.order_item_notes,
      })),
      platformTotal: Number(raw?.total_amount ?? 0),
      estimatedPrepMinutes: raw?.estimated_process_time,
      rawPayload: JSON.stringify(raw),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Try to match each aggregator item against the menu table.
   * Strategy: exact name match → case-insensitive contains match.
   * Unmatched items are logged but not thrown — we use platform price as fallback.
   */
  private async resolveMenuItems(
    items: AggregatorOrderItem[],
    channel: AggregatorChannel,
  ): Promise<
    Array<{ menuId: number; name: string; qty: number; resolvedPrice: number }>
  > {
    const resolved: Array<{
      menuId: number;
      name: string;
      qty: number;
      resolvedPrice: number;
    }> = [];

    const storeId = this.config.defaultStoreId;

    for (const item of items) {
      // Try exact name first
      let menu = await this.prisma.menu.findFirst({
        where: { name: item.name, is_active: true, store_id: storeId },
        select: { id: true, name: true, price: true },
      });

      // Fallback: contains match
      if (!menu) {
        menu = await this.prisma.menu.findFirst({
          where: {
            name: { contains: item.name },
            is_active: true,
            store_id: storeId,
          },
          select: { id: true, name: true, price: true },
          orderBy: { id: 'asc' },
        });
      }

      if (!menu) {
        this.logger.warn(
          `[${channel}] Item "${item.name}" not found in menu — using platform price`,
        );
        // Use item name directly with platform price; assign a virtual menu_id = 0
        // This still saves the order — reconciliation should happen in ops review.
        resolved.push({
          menuId: 0,
          name: item.name,
          qty: item.qty,
          resolvedPrice: item.unitPrice,
        });
        continue;
      }

      resolved.push({
        menuId: menu.id,
        name: menu.name,
        qty: item.qty,
        // Use Lecrion DB price to maintain pricing integrity
        resolvedPrice: Number(menu.price),
      });
    }

    return resolved;
  }

  /** Get first owner user ID for aggregator-created orders. */
  private async getSystemUserId(): Promise<number> {
    const user = await this.prisma.users.findFirst({
      where: { role: 'owner' },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return user?.id ?? 1;
  }

  private channelLabel(channel: AggregatorChannel): string {
    const labels: Record<AggregatorChannel, string> = {
      gofood: 'GoFood',
      grabfood: 'GrabFood',
      shopeefood: 'ShopeeFood',
    };
    return labels[channel];
  }
}
