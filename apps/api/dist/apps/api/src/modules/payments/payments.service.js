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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const audit_service_1 = require("../audit/audit.service");
const sync_service_1 = require("../sync/sync.service");
const enums_1 = require("../../../../../libs/contracts/src/enums");
const events_1 = require("../../../../../libs/contracts/src/events");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, audit, sync) {
        this.prisma = prisma;
        this.audit = audit;
        this.sync = sync;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async recordPayment(dto) {
        const { orderId, amount, paidAmount = 0, discount = 0, tax = 0, paymentMethod = 'Cash', storeId = 'default-store', operatorId = 'system', } = dto;
        const order = await this.prisma.orders.findUnique({
            where: { id: orderId },
        });
        if (!order)
            throw new common_1.NotFoundException(`Order #${orderId} not found`);
        const payment = await this.prisma.payments.create({
            data: {
                order_id: orderId,
                store_id: storeId,
                amount,
                paid_amount: paidAmount,
                discount,
                tax,
                payment_method: paymentMethod,
                status: enums_1.PaymentStatus.PENDING,
                created_at: new Date().toISOString(),
            },
        });
        this.audit.record({
            actor: operatorId,
            action: events_1.PAYMENT_EVENTS.RECORDED,
            resource: 'payments',
            resourceId: payment.id,
            after: { orderId, amount, paymentMethod, status: enums_1.PaymentStatus.PENDING },
            channel: 'api',
        });
        return { paymentId: payment.id, orderId, status: enums_1.PaymentStatus.PENDING };
    }
    async confirmPayment(dto) {
        const { paymentId, paidAmount, operatorId = 'system' } = dto;
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException(`Payment #${paymentId} not found`);
        if (payment.status === enums_1.PaymentStatus.PAID) {
            throw new common_1.BadRequestException(`Payment #${paymentId} is already paid`);
        }
        const now = new Date().toISOString();
        await this.prisma.$transaction(async (tx) => {
            await tx.payments.update({
                where: { id: paymentId },
                data: {
                    paid_amount: paidAmount,
                    status: enums_1.PaymentStatus.PAID,
                    completed_at: now,
                },
            });
            await tx.orders.update({
                where: { id: payment.order_id },
                data: { status: enums_1.OrderStatus.CONFIRMED },
            });
            await this.sync.writeOutboxInTx(tx, events_1.ORDER_EVENTS.CONFIRMED, {
                orderId: payment.order_id,
                paymentId,
                paidAmount,
                paymentMethod: payment.payment_method,
            }, { storeId: payment.store_id, source: 'payments' });
        });
        this.audit.record({
            actor: operatorId,
            action: events_1.PAYMENT_EVENTS.CONFIRMED,
            resource: 'payments',
            resourceId: paymentId,
            before: { status: enums_1.PaymentStatus.PENDING },
            after: { status: enums_1.PaymentStatus.PAID, paidAmount },
            storeId: payment.store_id,
            channel: 'api',
        });
        this.logger.log(`Payment #${paymentId} confirmed for order #${payment.order_id}`);
        return {
            paymentId,
            orderId: payment.order_id,
            status: enums_1.PaymentStatus.PAID,
            paidAmount,
        };
    }
    async getPaymentsByOrder(orderId) {
        return this.prisma.payments.findMany({
            where: { order_id: orderId },
            orderBy: { created_at: 'desc' },
        });
    }
    async getPaymentById(paymentId) {
        const payment = await this.prisma.payments.findUnique({
            where: { id: paymentId },
        });
        if (!payment)
            throw new common_1.NotFoundException(`Payment #${paymentId} not found`);
        return payment;
    }
    async listPayments(storeId = 'default-store', limit = 50) {
        return this.prisma.payments.findMany({
            where: { store_id: storeId },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_1.AuditService,
        sync_service_1.SyncService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map