import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { CartService } from '../chatbot/cart.service';
import { IdempotencyService } from './idempotency.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { OrderStatus } from '@libs/contracts/src/enums';
import { ORDER_EVENTS } from '@libs/contracts/src/events';
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly idempotencyService: IdempotencyService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly syncService: SyncService,
    private readonly realtimeService: RealtimeService,
    private readonly configService: AppConfigService,
  ) {}

  formatRupiah(v: number) {
    return new Intl.NumberFormat('id-ID').format(v);
  }

  sanitizePhone(s: string) {
    return String(s || '').replace(/\D/g, '');
  }

  async createOrderFromCart(opts: {
    sender: string;
    customerName?: string;
    orderType?: string;
    phone?: string;
    address?: string;
    idempotencyKey?: string;
    correlationId?: string;
    storeId?: string;
  }) {
    const {
      sender,
      customerName,
      orderType,
      phone = '',
      address = '',
      idempotencyKey,
      correlationId,
    } = opts;

    const cart = await this.cartService.getCart(sender);
    if (!cart.items.length) throw new Error('Keranjang masih kosong');

    const iKey =
      idempotencyKey ??
      this.idempotencyService.buildCheckoutKey(
        sender,
        cart.items.map((i) => i.productId),
      );
    const cached = await this.idempotencyService.check(iKey);
    if (cached) {
      this.logger.log(
        `[Checkout] Idempotent hit for key ${iKey} — returning cached result`,
      );
      return cached;
    }

    const finalOrderType = ['delivery', 'pickup'].includes(orderType || '')
      ? orderType
      : this.configService.defaultOrderType;

    // SEC-11: storeId now comes from the caller (BotDispatchService resolves
    // it per-conversation via BotRoutingService) — defaultStoreId is only a
    // fallback for callers that don't pass one (tests, other internal
    // callers), same convention as pos-sales.service.ts's SEC-05/06 fix.
    const storeId = opts.storeId ?? this.configService.defaultStoreId;

    const result = await this.prisma.$transaction(async (tx) => {
      const { userId } = await this.usersService.ensureUserByPhone(sender, tx);

      const menuIds = cart.items.map((item) => item.productId);
      const menuRows = await tx.menu.findMany({
        where: { id: { in: menuIds }, store_id: storeId },
      });

      if (menuRows.length !== cart.items.length)
        throw new Error('Ada produk yang tidak lagi tersedia');

      const menuMap = new Map(menuRows.map((item) => [Number(item.id), item]));

      for (const cartItem of cart.items) {
        const dbItem = menuMap.get(cartItem.productId);
        if (!dbItem)
          throw new Error(`Produk #${cartItem.productId} tidak ditemukan`);
        if (Number(dbItem.stock) < cartItem.qty) {
          throw new Error(
            `Stok ${dbItem.name} tidak cukup. Tersisa ${dbItem.stock}`,
          );
        }
      }

      const order = await tx.orders.create({
        data: {
          user_id: userId,
          type: finalOrderType || 'pickup',
          name: customerName || sender,
          phone: phone ? this.sanitizePhone(phone) : this.sanitizePhone(sender),
          address: address || '',
          payment_method: this.configService.defaultPaymentMethod,
          status: OrderStatus.PENDING,
          created_at: new Date().toISOString(),
          store_id: storeId,
        },
      });

      let total = 0;

      for (const cartItem of cart.items) {
        const dbItem = menuMap.get(cartItem.productId)!;
        const price = Number(dbItem.price);
        total += price * cartItem.qty;

        await tx.order_items.create({
          data: {
            order_id: order.id,
            menu_id: cartItem.productId,
            name: dbItem.name,
            price: price,
            qty: cartItem.qty,
          },
        });

        await tx.menu.update({
          where: { id: cartItem.productId },
          data: { stock: { decrement: cartItem.qty } },
        });

        const qtyBefore = Number(dbItem.stock);
        const qtyChange = -Math.abs(Number(cartItem.qty));
        await tx.stock_change_logs.create({
          data: {
            menu_id: cartItem.productId,
            order_id: order.id,
            change_type: 'order_decrease',
            qty_before: qtyBefore,
            qty_change: qtyChange,
            qty_after: qtyBefore + qtyChange,
            note: `Checkout order #${order.id}`,
            created_at: new Date().toISOString(),
          },
        });
      }

      // ── Outbox write — atomic with domain writes ──────────────────────────
      // This is the canonical path: outbox row committed in the same transaction
      // as the order and stock writes. If the transaction rolls back, no event
      // is published. The worker picks this up and emits to realtime.
      await this.syncService.writeOutboxInTx(
        tx,
        ORDER_EVENTS.CREATED,
        {
          orderId: order.id,
          total,
          type: finalOrderType,
          paymentMethod: this.configService.defaultPaymentMethod,
          itemCount: cart.items.length,
        },
        { source: 'checkout', correlationId },
      );

      return {
        orderId: order.id,
        total,
        displayTotal: total,
        items: cart.items.map((i) => ({ ...i })),
        type: finalOrderType,
        paymentMethod: this.configService.defaultPaymentMethod,
      };
    });

    // ── Outbox write is now INSIDE the transaction above ──────────────────────
    // The outbox row was committed atomically with the order and stock writes.
    // These post-commit calls are non-critical side effects only.
    await this.cartService.clearCart(sender);
    this.realtimeService.emitOrderCreated(result);
    this.idempotencyService.save(iKey, result);

    this.auditService.record({
      actor: sender,
      action: ORDER_EVENTS.CREATED,
      resource: 'orders',
      resourceId: result.orderId,
      after: {
        total: result.total,
        type: result.type,
        itemCount: result.items.length,
      },
      correlationId,
      channel: 'bot',
    });

    return result;
  }

  formatCheckoutSuccess(order: any) {
    const itemLines = order.items.map(
      (item: any) =>
        `- ${item.name} x${item.qty} = Rp${this.formatRupiah(item.qty * item.price)}`,
    );
    return [
      `✅ Checkout berhasil. Order #${order.orderId}`,
      ...itemLines,
      `Total: Rp${this.formatRupiah(order.total)}`,
      `Metode bayar: ${order.paymentMethod} (manual)`,
      'Pesanan kamu sedang diproses ya.',
    ].join('\n');
  }
}
