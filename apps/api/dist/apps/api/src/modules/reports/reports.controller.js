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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const reports_service_1 = require("./reports.service");
const read_model_service_1 = require("./read-model.service");
let ReportsController = class ReportsController {
    constructor(reportsService, readModel) {
        this.reportsService = reportsService;
        this.readModel = readModel;
    }
    getSalesSummary() {
        return this.reportsService.getSalesSummary();
    }
    getSalesDaily(limit) {
        return this.reportsService.getSalesDaily(limit ? parseInt(limit, 10) : 14);
    }
    getSalesByPayment() {
        return this.reportsService.getSalesByPayment();
    }
    getSalesByType() {
        return this.reportsService.getSalesByType();
    }
    getSalesTopProducts(year, month, limit) {
        return this.reportsService.getSalesTopProducts({
            year: year ? parseInt(year, 10) : undefined,
            month: month ? parseInt(month, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : 5,
        });
    }
    getStockChangeLogs(limit) {
        return this.reportsService.getStockChangeLogs(limit ? parseInt(limit, 10) : 30);
    }
    getYearBundle(year) {
        return this.reportsService.getYearDetailBundle(parseInt(year, 10));
    }
    getMonthBundle(year, month) {
        return this.reportsService.getMonthDetailBundle(parseInt(year, 10), parseInt(month, 10));
    }
    getAllProjections() {
        return this.readModel.getAll();
    }
    getProjection(name) {
        return this.readModel.get(name);
    }
    rebuildProjection(name) {
        return this.readModel
            .rebuild(name)
            .then(() => ({ ok: true, projection: name }));
    }
    rebuildAll() {
        return this.readModel.rebuildAll().then(() => ({ ok: true }));
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesSummary", null);
__decorate([
    (0, common_1.Get)('daily'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesDaily", null);
__decorate([
    (0, common_1.Get)('by-payment'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesByPayment", null);
__decorate([
    (0, common_1.Get)('by-type'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesByType", null);
__decorate([
    (0, common_1.Get)('top-products'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesTopProducts", null);
__decorate([
    (0, common_1.Get)('stock-changes'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getStockChangeLogs", null);
__decorate([
    (0, common_1.Get)('year/:year'),
    __param(0, (0, common_1.Param)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getYearBundle", null);
__decorate([
    (0, common_1.Get)('year/:year/month/:month'),
    __param(0, (0, common_1.Param)('year')),
    __param(1, (0, common_1.Param)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getMonthBundle", null);
__decorate([
    (0, common_1.Get)('projections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getAllProjections", null);
__decorate([
    (0, common_1.Get)('projections/:name'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getProjection", null);
__decorate([
    (0, common_1.Get)('projections/:name/rebuild'),
    __param(0, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "rebuildProjection", null);
__decorate([
    (0, common_1.Get)('projections-rebuild-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "rebuildAll", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        read_model_service_1.ReadModelService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map