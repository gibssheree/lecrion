"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CheckoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const cart_service_1 = require("../chatbot/cart.service");
const idempotency_service_1 = require("./idempotency.service");
const users_service_1 = require("../users/users.service");
const audit_service_1 = require("../audit/audit.service");
const sync_service_1 = require("../sync/sync.service");
const realtime_service_1 = require("../../infrastructure/realtime/realtime.service");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
const enums_1 = require("../../../../../libs/contracts/src/enums");
const events_1 = require("../../../../../libs/contracts/src/events");
let CheckoutService = CheckoutService_1 = class CheckoutService {
    constructor(prisma, cartService, idempotencyService, usersService, auditService, syncService, realtimeService, configService) {
        this.prisma = prisma;
        this.cartService = cartService;
        this.idempotencyService = idempotencyService;
        this.usersService = usersService;
        this.auditService = auditService;
        this.syncService = syncService;
        this.realtimeService = realtimeService;
        this.configService = configService;
        this.logger = new common_1.Logger(CheckoutService_1.name);
    }
    formatRupiah(v) {
        return new Intl.NumberFormat('id-ID').format(v);
    }
    sanitizePhone(s) {
        return String(s || '').replace(/\D/g, '');
    }
    async createOrderFromCart(opts) {
        const { sender, customerName, orderType, phone = '', address = '', idempotencyKey, correlationId, } = opts;
        const cart = await this.cartService.getCart(sender);
        if (!cart.items.length)
            throw new Error('Keranjang masih kosong');
        const iKey = idempotencyKey ??
            this.idempotencyService.buildCheckoutKey(sender, cart.items.map((i) => i.productId));
        const cached = await this.idempotencyService.check(iKey);
        if (cached) {
            this.logger.log(`[Checkout] Idempotent hit for key ${iKey} — returning cached result`);
            return cached;
        }
        const finalOrderType = ['delivery', 'pickup'].includes(orderType || '')
            ? orderType
            : this.configService.defaultOrderType;
        const result = await this.prisma.$transaction(async (tx) => {
            const { userId } = await this.usersService.ensureUserByPhone(sender, tx);
            const menuIds = cart.items.map((item) => item.productId);
            const menuRows = await tx.menu.findMany({
                where: { id: { in: menuIds } },
            });
            if (menuRows.length !== cart.items.length)
                throw new Error('Ada produk yang tidak lagi tersedia');
            const menuMap = new Map(menuRows.map((item) => [Number(item.id), item]));
            for (const cartItem of cart.items) {
                const dbItem = menuMap.get(cartItem.productId);
                if (!dbItem)
                    throw new Error(`Produk #${cartItem.productId} tidak ditemukan`);
                if (Number(dbItem.stock) < cartItem.qty) {
                    throw new Error(`Stok ${dbItem.name} tidak cukup. Tersisa ${dbItem.stock}`);
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
                    status: enums_1.OrderStatus.PENDING,
                    created_at: new Date().toISOString(),
                },
            });
            let total = 0;
            for (const cartItem of cart.items) {
                const dbItem = menuMap.get(cartItem.productId);
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
            await this.syncService.writeOutboxInTx(tx, events_1.ORDER_EVENTS.CREATED, {
                orderId: order.id,
                total,
                type: finalOrderType,
                paymentMethod: this.configService.defaultPaymentMethod,
                itemCount: cart.items.length,
            }, { source: 'checkout', correlationId });
            return {
                orderId: order.id,
                total,
                displayTotal: total,
                items: cart.items.map((i) => ({ ...i })),
                type: finalOrderType,
                paymentMethod: this.configService.defaultPaymentMethod,
            };
        });
        await this.cartService.clearCart(sender);
        this.realtimeService.emitOrderCreated(result);
        this.idempotencyService.save(iKey, result);
        this.auditService.record({
            actor: sender,
            action: events_1.ORDER_EVENTS.CREATED,
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
    formatCheckoutSuccess(order) {
        const itemLines = order.items.map((item) => `- ${item.name} x${item.qty} = Rp${this.formatRupiah(item.qty * item.price)}`);
        return [
            `✅ Checkout berhasil. Order #${order.orderId}`,
            ...itemLines,
            `Total: Rp${this.formatRupiah(order.total)}`,
            `Metode bayar: ${order.paymentMethod} (manual)`,
            'Pesanan kamu sedang diproses ya.',
        ].join('\n');
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = CheckoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        cart_service_1.CartService,
        idempotency_service_1.IdempotencyService,
        users_service_1.UsersService,
        audit_service_1.AuditService,
        sync_service_1.SyncService,
        realtime_service_1.RealtimeService,
        app_config_service_1.AppConfigService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map