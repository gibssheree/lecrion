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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashflowController = void 0;
const common_1 = require("@nestjs/common");
const cashflow_service_1 = require("./cashflow.service");
let CashflowController = class CashflowController {
    constructor(cashflowService) {
        this.cashflowService = cashflowService;
    }
    openSession(dto) {
        return this.cashflowService.openSession(dto);
    }
    closeSession(dto) {
        return this.cashflowService.closeSession(dto);
    }
    getActiveSession(storeId) {
        return this.cashflowService.getActiveSession(storeId);
    }
    listSessions(storeId, limit) {
        return this.cashflowService.listSessions(storeId, limit ? parseInt(limit, 10) : 20);
    }
    getSessionBalance(id) {
        return this.cashflowService
            .getSessionBalance(id)
            .then((balance) => ({ sessionId: id, balance }));
    }
    listEntries(id, limit) {
        return this.cashflowService.listEntries(id, limit ? parseInt(limit, 10) : 100);
    }
    recordEntry(dto) {
        return this.cashflowService.recordEntry(dto);
    }
};
exports.CashflowController = CashflowController;
__decorate([
    (0, common_1.Post)('sessions/open'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "openSession", null);
__decorate([
    (0, common_1.Post)('sessions/close'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "closeSession", null);
__decorate([
    (0, common_1.Get)('sessions/active'),
    __param(0, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "getActiveSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Query)('storeId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "listSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:id/balance'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "getSessionBalance", null);
__decorate([
    (0, common_1.Get)('sessions/:id/entries'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "listEntries", null);
__decorate([
    (0, common_1.Post)('entries'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashflowController.prototype, "recordEntry", null);
exports.CashflowController = CashflowController = __decorate([
    (0, common_1.Controller)('cashflow'),
    __metadata("design:paramtypes", [cashflow_service_1.CashflowService])
], CashflowController);
//# sourceMappingURL=cashflow.controller.js.map