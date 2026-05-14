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
var StoresService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoresService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let StoresService = StoresService_1 = class StoresService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StoresService_1.name);
    }
    dbKey(storeId, key) {
        if (key.startsWith(`${storeId}:`))
            return key;
        return `${storeId}:${key}`;
    }
    async getSettings(storeId = 'default-store') {
        const prefix = `${storeId}:`;
        const rows = await this.prisma.store_settings.findMany({
            where: { key: { startsWith: prefix } },
        });
        const result = {};
        for (const row of rows) {
            const cleanKey = row.key.startsWith(prefix)
                ? row.key.slice(prefix.length)
                : row.key;
            result[cleanKey] = row.value;
        }
        return result;
    }
    async getSetting(key, defaultValue = '', storeId = 'default-store') {
        const row = await this.prisma.store_settings.findUnique({
            where: { key: this.dbKey(storeId, key) },
        });
        return row?.value ?? defaultValue;
    }
    async setSetting(key, value, storeId = 'default-store') {
        const dbKey = this.dbKey(storeId, key);
        const now = new Date().toISOString();
        await this.prisma.store_settings.upsert({
            where: { key: dbKey },
            update: { value, updated_at: now },
            create: { key: dbKey, value, updated_at: now },
        });
        this.logger.log(`Store setting updated: ${key} [store=${storeId}]`);
    }
    async setSettings(settings, storeId = 'default-store') {
        const now = new Date().toISOString();
        await Promise.all(Object.entries(settings).map(([key, value]) => {
            const dbKey = this.dbKey(storeId, key);
            return this.prisma.store_settings.upsert({
                where: { key: dbKey },
                update: { value, updated_at: now },
                create: { key: dbKey, value, updated_at: now },
            });
        }));
        this.logger.log(`Store settings updated: ${Object.keys(settings).join(', ')} [store=${storeId}]`);
    }
    async deleteSetting(key, storeId = 'default-store') {
        await this.prisma.store_settings
            .delete({ where: { key: this.dbKey(storeId, key) } })
            .catch(() => { });
    }
    getStoreInfo(storeId = 'default-store') {
        return {
            storeId,
            name: 'Lecrion',
            tenantId: 'default',
            status: 'active',
        };
    }
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = StoresService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], StoresService);
//# sourceMappingURL=stores.service.js.map