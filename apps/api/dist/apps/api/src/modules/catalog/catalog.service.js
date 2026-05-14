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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let CatalogService = class CatalogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    toDisplayRupiah(basePrice) {
        return Number(basePrice) || 0;
    }
    formatRupiah(basePrice) {
        return new Intl.NumberFormat('id-ID').format(Number(basePrice) || 0);
    }
    inferCategory(name = '', imageUrl = '') {
        const text = `${name} ${imageUrl || ''}`.toLowerCase();
        if (text.includes('drink') || text.includes('minum') || text.includes('juice') || text.includes('es '))
            return 'Minuman';
        if (text.includes('snack') || text.includes('pisang') || text.includes('roti') || text.includes('kentang') || text.includes('pie') || text.includes('ubi'))
            return 'Snack';
        return 'Makanan';
    }
    normalizeProduct(row) {
        const basePrice = Number(row.price);
        return {
            id: Number(row.id),
            name: row.name,
            price: basePrice,
            displayPrice: this.toDisplayRupiah(basePrice),
            stock: Number(row.stock),
            description: row.description || '',
            imageUrl: row.image_url || null,
            category: this.inferCategory(row.name, row.image_url),
            available: Number(row.stock) > 0,
        };
    }
    async getAllProducts() {
        const rows = await this.prisma.menu.findMany({
            orderBy: { name: 'asc' },
        });
        return rows.map(r => this.normalizeProduct(r));
    }
    async getProductById(id) {
        const row = await this.prisma.menu.findUnique({
            where: { id },
        });
        return row ? this.normalizeProduct(row) : null;
    }
    async findProductByName(keyword) {
        if (!keyword?.trim())
            return null;
        const rows = await this.prisma.menu.findMany({
            where: {
                name: { contains: keyword.trim() }
            },
            orderBy: [
                { stock: 'desc' },
                { id: 'asc' }
            ],
            take: 1,
        });
        return rows.length ? this.normalizeProduct(rows[0]) : null;
    }
    async searchProducts(keyword, limit = 8) {
        const normalizedKeyword = (keyword || '').trim();
        const rows = await this.prisma.menu.findMany({
            where: {
                OR: [
                    { name: { contains: normalizedKeyword } },
                    { description: { contains: normalizedKeyword } },
                ]
            },
            orderBy: [
                { stock: 'desc' },
                { name: 'asc' }
            ],
            take: Number(limit) || 8,
        });
        return rows.map(r => this.normalizeProduct(r));
    }
    async getCatalogContext(limit = 25) {
        const rows = await this.prisma.menu.findMany({
            orderBy: [
                { stock: 'desc' },
                { name: 'asc' }
            ],
            take: Number(limit) || 25,
        });
        if (!rows.length)
            return 'Belum ada produk tersedia.';
        return rows.map((row) => {
            const stockText = Number(row.stock) > 0 ? `stok ${row.stock}` : 'stok habis';
            return `#${row.id} ${row.name} - Rp${this.formatRupiah(Number(row.price))} (${stockText})`;
        }).join('\n');
    }
    async getCatalogForStore() {
        return this.getAllProducts();
    }
    async updateStock(id, stock) {
        return this.prisma.menu.update({
            where: { id },
            data: { stock },
        });
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map