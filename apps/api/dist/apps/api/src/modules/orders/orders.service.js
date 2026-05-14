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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const audit_service_1 = require("../audit/audit.service");
const sync_service_1 = require("../sync/sync.service");
const realtime_service_1 = require("../../infrastructure/realtime/realtime.service");
const enums_1 = require("../../../../../libs/contracts/src/enums");
const events_1 = require("../../../../../libs/contracts/src/events");
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, audit, sync, realtime) {
        this.prisma = prisma;
        this.audit = audit;
        this.sync = sync;
        this.realtime = realtime;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async listOrders(statusFilter = 'all', limit = 50) {
        const safeLimit = Math.min(Number(limit) || 50, 200);
        const orders = await this.prisma.orders.findMany({
            where: statusFilter !== 'all' ? { status: statusFilter } : undefined,
            orderBy: { created_at: 'desc' },
            take: safeLimit,
            select: {
                id: true,
                user_id: true,
                type: true,
                name: true,
                phone: true,
                address: true,
                delivery_cost: true,
                payment_method: true,
                status: true,
                created_at: true,
                estimated_time: true,
                order_items: {
                    select: { price: true, qty: true },
                },
            },
        });
        return orders.map((o) => ({
            ...o,
            total: o.order_items.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0),
            order_items: undefined,
        }));
    }
    async getOrderById(id) {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            include: { order_items: true },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order #${id} not found`);
        return order;
    }
    async updateOrderStatus(id, newStatus, operatorId = 'system') {
        if (!enums_1.ORDER_STATUS_VALUES.includes(newStatus)) {
            throw new Error(`Invalid order status: "${newStatus}". Valid values: ${enums_1.ORDER_STATUS_VALUES.join(', ')}`);
        }
        const order = await this.prisma.orders.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order #${id} not found`);
        const oldStatus = order.status;
        if (oldStatus === newStatus)
            return true;
        await this.prisma.$transaction(async (tx) => {
            await tx.orders.update({
                where: { id },
                data: { status: newStatus },
            });
            await this.sync.writeOutboxInTx(tx, events_1.ORDER_EVENTS.STATUS_CHANGED, { orderId: id, oldStatus, newStatus }, { source: 'orders' });
        });
        this.audit.record({
            actor: operatorId,
            action: events_1.ORDER_EVENTS.STATUS_CHANGED,
            resource: 'orders',
            resourceId: id,
            before: { status: oldStatus },
            after: { status: newStatus },
            channel: 'api',
        });
        this.realtime.emit(events_1.ORDER_EVENTS.STATUS_CHANGED, {
            orderId: id,
            oldStatus,
            newStatus,
        });
        this.logger.log(`Order #${id} status: ${oldStatus} → ${newStatus}`);
        return true;
    }
    async cancelOrder(id, reason, operatorId = 'system') {
        const order = await this.prisma.orders.findUnique({
            where: { id },
            select: { status: true },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order #${id} not found`);
        const now = new Date().toISOString();
        await this.prisma.$transaction(async (tx) => {
            await tx.orders.update({
                where: { id },
                data: {
                    status: enums_1.OrderStatus.CANCELLED,
                    cancelled_at: now,
                    cancellation_reason: reason,
                },
            });
            await this.sync.writeOutboxInTx(tx, events_1.ORDER_EVENTS.CANCELLED, { orderId: id, reason }, { source: 'orders' });
        });
        this.audit.record({
            actor: operatorId,
            action: events_1.ORDER_EVENTS.CANCELLED,
            resource: 'orders',
            resourceId: id,
            before: { status: order.status },
            after: { status: enums_1.OrderStatus.CANCELLED, reason },
            channel: 'api',
        });
        this.realtime.emit(events_1.ORDER_EVENTS.CANCELLED, { orderId: id, reason });
        return { orderId: id, status: enums_1.OrderStatus.CANCELLED, reason };
    }
    async getOrdersByUser(userId, limit = 20) {
        return this.prisma.orders.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' },
            take: limit,
            include: { order_items: true },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_1.AuditService,
        sync_service_1.SyncService,
        realtime_service_1.RealtimeService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map