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
var RegisterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterService = void 0;
const common_1 = require("@nestjs/common");
const cashflow_service_1 = require("../cashflow/cashflow.service");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const enums_1 = require("../../../../../libs/contracts/src/enums");
let RegisterService = RegisterService_1 = class RegisterService {
    constructor(cashflow, prisma) {
        this.cashflow = cashflow;
        this.prisma = prisma;
        this.logger = new common_1.Logger(RegisterService_1.name);
    }
    async openSession(dto) {
        this.logger.log(`Opening register session for store=${dto.storeId ?? 'default-store'} cashier=${dto.cashierId}`);
        return this.cashflow.openSession(dto);
    }
    async closeSession(dto) {
        this.logger.log(`Closing register session #${dto.sessionId}`);
        return this.cashflow.closeSession(dto);
    }
    async getActiveSession(storeId = 'default-store') {
        return this.cashflow.getActiveSession(storeId);
    }
    async getSessionById(sessionId) {
        return this.prisma.cash_register_sessions.findUnique({
            where: { id: sessionId },
        });
    }
    async listSessions(storeId = 'default-store', limit = 20) {
        return this.cashflow.listSessions(storeId, limit);
    }
    async getSessionBalance(sessionId) {
        return this.cashflow.getSessionBalance(sessionId);
    }
    async suspendSession(sessionId, operatorId) {
        const session = await this.prisma.cash_register_sessions.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.status !== enums_1.RegisterSessionStatus.OPEN) {
            throw new Error(`Session #${sessionId} is not open`);
        }
        await this.prisma.cash_register_sessions.update({
            where: { id: sessionId },
            data: { status: enums_1.RegisterSessionStatus.SUSPENDED },
        });
        this.logger.log(`Session #${sessionId} suspended by ${operatorId}`);
        return { sessionId, status: enums_1.RegisterSessionStatus.SUSPENDED };
    }
    async resumeSession(sessionId, operatorId) {
        const session = await this.prisma.cash_register_sessions.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.status !== enums_1.RegisterSessionStatus.SUSPENDED) {
            throw new Error(`Session #${sessionId} is not suspended`);
        }
        await this.prisma.cash_register_sessions.update({
            where: { id: sessionId },
            data: { status: enums_1.RegisterSessionStatus.OPEN },
        });
        this.logger.log(`Session #${sessionId} resumed by ${operatorId}`);
        return { sessionId, status: enums_1.RegisterSessionStatus.OPEN };
    }
};
exports.RegisterService = RegisterService;
exports.RegisterService = RegisterService = RegisterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cashflow_service_1.CashflowService,
        prisma_1.PrismaService])
], RegisterService);
//# sourceMappingURL=register.service.js.map