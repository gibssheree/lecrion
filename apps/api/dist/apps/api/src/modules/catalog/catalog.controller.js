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
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("./catalog.service");
const audit_service_1 = require("../audit/audit.service");
const realtime_service_1 = require("../../infrastructure/realtime/realtime.service");
const events_1 = require("../../../../../libs/contracts/src/events");
let CatalogController = class CatalogController {
    constructor(catalogService, audit, realtime) {
        this.catalogService = catalogService;
        this.audit = audit;
        this.realtime = realtime;
    }
    async getProducts(q) {
        try {
            const keyword = String(q || '').trim();
            const products = keyword
                ? await this.catalogService.searchProducts(keyword)
                : await this.catalogService.getAllProducts();
            return { products };
        }
        catch (error) {
            throw new common_1.HttpException({ status: 'error', message: 'failed_to_fetch_products' }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
    async getProductById(idParam) {
        const id = Number(idParam);
        if (!Number.isInteger(id) || id <= 0) {
            throw new common_1.HttpException({ status: 'invalid_id' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const product = await this.catalogService.getProductById(id);
        if (!product) {
            throw new common_1.HttpException({ status: 'not_found' }, common_1.HttpStatus.NOT_FOUND);
        }
        return { product };
    }
    async updateStock(idParam, stockParam) {
        const id = Number(idParam);
        const stock = Number(stockParam);
        if (!Number.isInteger(id) || !Number.isInteger(stock) || stock < 0) {
            throw new common_1.HttpException({ status: 'error', message: 'invalid input' }, common_1.HttpStatus.BAD_REQUEST);
        }
        const product = await this.catalogService.getProductById(id);
        if (!product) {
            throw new common_1.HttpException({ status: 'not_found' }, common_1.HttpStatus.NOT_FOUND);
        }
        const oldStock = product.stock;
        await this.catalogService.updateStock(id, stock);
        this.audit.record({
            actor: 'dashboard',
            action: events_1.STOCK_EVENTS.ADJUSTED,
            resource: 'menu',
            resourceId: id,
            before: { stock: oldStock },
            after: { stock },
            channel: 'dashboard',
        });
        this.realtime.emit(events_1.STOCK_EVENTS.ADJUSTED, {
            productId: id,
            name: product.name,
            oldStock,
            stock,
        });
        if (stock <= 5 && stock >= 0) {
            this.realtime.emit(events_1.STOCK_EVENTS.LOW, {
                productId: id,
                name: product.name,
                stock,
            });
        }
        return { status: 'success', id, stock };
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getProductById", null);
__decorate([
    (0, common_1.Patch)(':id/stock'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('stock')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "updateStock", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService,
        audit_service_1.AuditService,
        realtime_service_1.RealtimeService])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map