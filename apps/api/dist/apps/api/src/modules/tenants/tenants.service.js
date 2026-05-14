"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TenantsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
let TenantsService = TenantsService_1 = class TenantsService {
    constructor() {
        this.logger = new common_1.Logger(TenantsService_1.name);
    }
    async validateTenant(tenantId) {
        return tenantId === 'default' || tenantId?.length > 0;
    }
    async validateStore(storeId, tenantId) {
        return storeId?.length > 0 && tenantId?.length > 0;
    }
    getDefaultStore(tenantId = 'default') {
        return 'default-store';
    }
    buildCacheKey(tenantId, storeId, key) {
        return `${tenantId}:${storeId}:${key}`;
    }
    buildRealtimeChannel(storeId) {
        return `store:${storeId}`;
    }
    listTenants() {
        return [{ tenantId: 'default', name: 'Lecrion', status: 'active' }];
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = TenantsService_1 = __decorate([
    (0, common_1.Injectable)()
], TenantsService);
//# sourceMappingURL=tenants.service.js.map