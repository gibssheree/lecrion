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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let InventoryService = class InventoryService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchIngredientByName(keyword) {
        if (!keyword?.trim())
            return null;
        return this.prisma.menu.findFirst({
            where: {
                name: {
                    contains: keyword.trim(),
                },
            },
            orderBy: [
                { stock: 'desc' },
                { id: 'asc' },
            ],
            select: {
                id: true,
                name: true,
                stock: true,
            },
        });
    }
    async getIngredientGlobalStats() {
        const aggregations = await this.prisma.menu.aggregate({
            _count: {
                id: true,
            },
            _sum: {
                stock: true,
            },
        });
        return {
            totalItems: aggregations._count.id || 0,
            totalStock: aggregations._sum.stock || 0,
        };
    }
    async getIngredientSummaryByCategory() {
        return {};
    }
    async getAllIngredientStocks(limit = 100) {
        return this.prisma.menu.findMany({
            select: {
                id: true,
                name: true,
                stock: true,
            },
            orderBy: {
                name: 'asc',
            },
            take: limit,
        });
    }
    async getIngredientsByCategory(category, limit = 25) {
        return this.prisma.menu.findMany({
            select: {
                id: true,
                name: true,
                stock: true,
            },
            orderBy: {
                name: 'asc',
            },
            take: limit,
        });
    }
    async getLowStockIngredients(threshold = 5) {
        return this.prisma.menu.findMany({
            where: {
                stock: {
                    gt: 0,
                    lte: threshold,
                },
            },
            select: {
                id: true,
                name: true,
                stock: true,
            },
            orderBy: {
                stock: 'asc',
            },
        });
    }
    async getOutOfStockIngredients(limit = 100) {
        return this.prisma.menu.findMany({
            where: {
                stock: {
                    lte: 0,
                },
            },
            select: {
                id: true,
                name: true,
                stock: true,
            },
            orderBy: {
                name: 'asc',
            },
            take: limit,
        });
    }
    async getPopIceAvailability() {
        return this.prisma.menu.findMany({
            where: {
                name: {
                    contains: 'pop ice',
                },
            },
            select: {
                id: true,
                name: true,
                stock: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map