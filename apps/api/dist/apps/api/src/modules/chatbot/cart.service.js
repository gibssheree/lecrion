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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let CartService = class CartService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCart(sender) {
        const row = await this.prisma.carts.findUnique({
            where: { sender },
        });
        if (!row) {
            return {
                sender,
                items: [],
                subtotal: 0,
                total: 0,
                updatedAt: new Date().toISOString(),
            };
        }
        const payload = JSON.parse(row.payload);
        const totals = this.calculateTotals(payload.items);
        return {
            sender,
            items: payload.items,
            subtotal: totals.subtotal,
            total: totals.total,
            updatedAt: row.updated_at,
        };
    }
    calculateTotals(items) {
        const subtotal = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
        return { subtotal, total: subtotal };
    }
    async saveCart(sender, items) {
        const payload = JSON.stringify({ items });
        const now = new Date().toISOString();
        await this.prisma.carts.upsert({
            where: { sender },
            update: {
                payload,
                updated_at: now,
            },
            create: {
                sender,
                payload,
                updated_at: now,
            },
        });
    }
    async addItemToCart(sender, productId, qty = 1) {
        const quantity = Number(qty);
        if (!Number.isInteger(quantity) || quantity <= 0)
            throw new Error('Jumlah item tidak valid');
        const product = await this.prisma.menu.findUnique({
            where: { id: productId },
        });
        if (!product)
            throw new Error('Produk tidak ditemukan');
        if (product.stock < quantity)
            throw new Error(`Stok ${product.name} tidak cukup. Tersisa ${product.stock}`);
        const cart = await this.getCart(sender);
        const existing = cart.items.find((item) => item.productId === product.id);
        if (existing) {
            const nextQty = existing.qty + quantity;
            if (nextQty > product.stock)
                throw new Error(`Stok ${product.name} tidak cukup. Tersisa ${product.stock}`);
            existing.qty = nextQty;
        }
        else {
            cart.items.push({
                productId: product.id,
                name: product.name,
                qty: quantity,
                price: Number(product.price),
            });
        }
        await this.saveCart(sender, cart.items);
        return this.getCart(sender);
    }
    async removeItemFromCart(sender, productRef) {
        const cart = await this.getCart(sender);
        const before = cart.items.length;
        cart.items = cart.items.filter((item) => {
            if (typeof productRef === 'number' && item.productId === productRef)
                return false;
            if (typeof productRef === 'string' && !isNaN(Number(productRef)) && item.productId === Number(productRef))
                return false;
            return item.name.toLowerCase() !== String(productRef).toLowerCase();
        });
        if (cart.items.length < before) {
            await this.saveCart(sender, cart.items);
        }
        return { removed: cart.items.length < before, cart: await this.getCart(sender) };
    }
    async clearCart(sender) {
        await this.prisma.carts.delete({
            where: { sender },
        }).catch(() => { });
        return this.getCart(sender);
    }
    formatCartForMessage(cart) {
        if (!cart.items.length)
            return 'Keranjang kamu masih kosong.';
        const lines = cart.items.map((item, index) => `${index + 1}. ${item.name} x${item.qty} = Rp${new Intl.NumberFormat('id-ID').format(item.qty * item.price)}`);
        return [
            'Keranjang kamu:',
            ...lines,
            `Total: Rp${new Intl.NumberFormat('id-ID').format(cart.total)}`,
        ].join('\n');
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map