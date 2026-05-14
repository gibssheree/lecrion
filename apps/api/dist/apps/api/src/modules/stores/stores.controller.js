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
exports.StoresController = void 0;
const common_1 = require("@nestjs/common");
const stores_service_1 = require("./stores.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const tenant_guard_1 = require("../../common/guards/tenant.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const store_id_decorator_1 = require("../../common/decorators/store-id.decorator");
let StoresController = class StoresController {
    constructor(storesService) {
        this.storesService = storesService;
    }
    getStoreInfo(storeId) {
        return this.storesService.getStoreInfo(storeId);
    }
    getSettings(storeId) {
        return this.storesService.getSettings(storeId);
    }
    setSettings(body, storeId) {
        return this.storesService
            .setSettings(body, storeId)
            .then(() => ({ ok: true, storeId }));
    }
    setSetting(key, body, storeId) {
        return this.storesService
            .setSetting(key, body.value, storeId)
            .then(() => ({ ok: true, key, storeId }));
    }
    getSetting(key, defaultValue, storeId) {
        return this.storesService
            .getSetting(key, defaultValue, storeId)
            .then((value) => ({ key, value, storeId }));
    }
    deleteSetting(key, storeId) {
        return this.storesService
            .deleteSetting(key, storeId)
            .then(() => ({ ok: true, key, storeId }));
    }
};
exports.StoresController = StoresController;
__decorate([
    (0, common_1.Get)('info'),
    __param(0, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "getStoreInfo", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, roles_decorator_1.Roles)('owner', 'manager'),
    __param(0, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    (0, roles_decorator_1.Roles)('owner', 'manager'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "setSettings", null);
__decorate([
    (0, common_1.Post)('settings/:key'),
    (0, roles_decorator_1.Roles)('owner', 'manager'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "setSetting", null);
__decorate([
    (0, common_1.Get)('settings/:key'),
    (0, roles_decorator_1.Roles)('owner', 'manager'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Query)('default')),
    __param(2, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "getSetting", null);
__decorate([
    (0, common_1.Delete)('settings/:key'),
    (0, roles_decorator_1.Roles)('owner'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, store_id_decorator_1.StoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "deleteSetting", null);
exports.StoresController = StoresController = __decorate([
    (0, common_1.Controller)('stores'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [stores_service_1.StoresService])
], StoresController);
//# sourceMappingURL=stores.controller.js.map