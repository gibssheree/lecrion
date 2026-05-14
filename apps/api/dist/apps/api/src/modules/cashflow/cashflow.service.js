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
var CashflowService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashflowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const audit_service_1 = require("../audit/audit.service");
const enums_1 = require("../../../../../libs/contracts/src/enums");
const events_1 = require("../../../../../libs/contracts/src/events");
let CashflowService = CashflowService_1 = class CashflowService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(CashflowService_1.name);
    }
    async openSession(dto) {
        const { storeId = 'default-store', cashierId, openingCash = 0, notes = '', } = dto;
        const existing = await this.prisma.cash_register_sessions.findFirst({
            where: { store_id: storeId, status: enums_1.RegisterSessionStatus.OPEN },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Register session #${existing.id} is already open for this store`);
        }
        const session = await this.prisma.cash_register_sessions.create({
            data: {
                store_id: storeId,
                cashier_id: cashierId,
                opening_cash: openingCash,
                expected_cash: openingCash,
                notes: notes || null,
                status: enums_1.RegisterSessionStatus.OPEN,
            },
        });
        this.audit.record({
            actor: cashierId,
            action: events_1.REGISTER_EVENTS.OPENED,
            resource: 'cash_register_sessions',
            resourceId: session.id,
            after: { storeId, openingCash },
            channel: 'api',
        });
        this.logger.log(`Register session opened #${session.id} by ${cashierId}`);
        return { sessionId: session.id };
    }
    async closeSession(dto) {
        const { sessionId, countedCash, notes = '', operatorId } = dto;
        const session = await this.prisma.cash_register_sessions.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException(`Session #${sessionId} not found`);
        if (session.status !== enums_1.RegisterSessionStatus.OPEN) {
            throw new common_1.BadRequestException(`Session #${sessionId} is already ${session.status}`);
        }
        const balance = await this.getSessionBalance(sessionId);
        const expected = balance + Number(session.opening_cash);
        const variance = Number(countedCash) - expected;
        await this.prisma.cash_register_sessions.update({
            where: { id: sessionId },
            data: {
                status: enums_1.RegisterSessionStatus.CLOSED,
                counted_cash: countedCash,
                expected_cash: expected,
                variance,
                notes: notes || null,
                closed_at: new Date().toISOString(),
            },
        });
        this.audit.record({
            actor: operatorId,
            action: events_1.REGISTER_EVENTS.CLOSED,
            resource: 'cash_register_sessions',
            resourceId: sessionId,
            before: {
                status: enums_1.RegisterSessionStatus.OPEN,
                expected_cash: session.expected_cash,
            },
            after: {
                status: enums_1.RegisterSessionStatus.CLOSED,
                countedCash,
                expected,
                variance,
            },
            channel: 'api',
        });
        this.logger.log(`Register session #${sessionId} closed. Variance: ${variance}`);
        return { sessionId, countedCash, expected, variance };
    }
    async recordEntry(dto) {
        const { entryType, amount, operatorId, storeId = 'default-store', sessionId, referenceType, referenceId, category, note, paymentMethod = 'Cash', } = dto;
        const validEntryTypes = Object.values(enums_1.CashflowEntryType);
        if (!validEntryTypes.includes(entryType)) {
            throw new common_1.BadRequestException(`Invalid entryType: "${entryType}". Valid values: ${validEntryTypes.join(', ')}`);
        }
        if (Number(amount) <= 0) {
            throw new common_1.BadRequestException('Amount must be positive');
        }
        let resolvedSessionId = sessionId;
        if (!resolvedSessionId) {
            const active = await this.prisma.cash_register_sessions.findFirst({
                where: { store_id: storeId, status: enums_1.RegisterSessionStatus.OPEN },
            });
            if (!active) {
                throw new common_1.BadRequestException('No open register session. Open a session before recording cashflow.');
            }
            resolvedSessionId = active.id;
        }
        const entry = await this.prisma.cashflow_entries.create({
            data: {
                session_id: resolvedSessionId,
                store_id: storeId,
                entry_type: entryType,
                amount,
                payment_method: paymentMethod,
                reference_type: referenceType ?? null,
                reference_id: referenceId ?? null,
                category: category ?? null,
                note: note ?? '',
                operator_id: operatorId,
                created_at: new Date().toISOString(),
            },
        });
        const eventMap = {
            [enums_1.CashflowEntryType.INCOME]: events_1.CASHFLOW_EVENTS.INCOME_RECORDED,
            [enums_1.CashflowEntryType.EXPENSE]: events_1.CASHFLOW_EVENTS.EXPENSE_RECORDED,
            [enums_1.CashflowEntryType.REFUND]: events_1.CASHFLOW_EVENTS.REFUND_RECORDED,
        };
        this.audit.record({
            actor: operatorId,
            action: eventMap[entryType] ?? `cashflow.${entryType}.recorded`,
            resource: 'cashflow_entries',
            resourceId: entry.id,
            after: { entryType, amount, paymentMethod },
            channel: 'api',
        });
        return { entryId: entry.id, sessionId: resolvedSessionId };
    }
    async getSessionBalance(sessionId) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT entry_type, SUM(amount) AS total
       FROM cashflow_entries WHERE session_id = ? GROUP BY entry_type`, sessionId);
        let balance = 0;
        for (const row of rows) {
            if (row.entry_type === 'income')
                balance += Number(row.total);
            else
                balance -= Number(row.total);
        }
        return balance;
    }
    async getActiveSession(storeId = 'default-store') {
        return this.prisma.cash_register_sessions.findFirst({
            where: { store_id: storeId, status: enums_1.RegisterSessionStatus.OPEN },
        });
    }
    async listEntries(sessionId, limit = 100) {
        return this.prisma.cashflow_entries.findMany({
            where: { session_id: sessionId },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
    }
    async listSessions(storeId = 'default-store', limit = 20) {
        return this.prisma.cash_register_sessions.findMany({
            where: { store_id: storeId },
            orderBy: { opened_at: 'desc' },
            take: limit,
        });
    }
};
exports.CashflowService = CashflowService;
exports.CashflowService = CashflowService = CashflowService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        audit_service_1.AuditService])
], CashflowService);
//# sourceMappingURL=cashflow.service.js.map