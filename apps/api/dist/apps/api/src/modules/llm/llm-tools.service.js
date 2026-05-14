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
exports.LlmToolsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let LlmToolsService = class LlmToolsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async executeTool(toolName, args = {}) {
        try {
            switch (toolName) {
                case 'check_product_stock':
                    return await this.checkProductStock(args.name);
                case 'get_order_status':
                    return await this.getOrderStatus(args.orderId);
                case 'list_open_orders':
                    return await this.listOpenOrders(args.limit);
                case 'get_daily_sales_summary':
                    return await this.getDailySalesSummary();
                case 'search_customer_history':
                    return await this.searchCustomerHistory(args.phone);
                default:
                    return { ok: false, error: `Tool "${toolName}" tidak dikenal` };
            }
        }
        catch (err) {
            return { ok: false, error: err.message };
        }
    }
    async checkProductStock(name) {
        if (!name)
            return { ok: false, error: 'Parameter name diperlukan' };
        const rows = await this.prisma.menu.findMany({
            where: { name: { contains: name } },
            take: 5,
            select: { id: true, name: true, price: true, stock: true },
        });
        if (!rows.length) {
            return {
                ok: true,
                result: {
                    found: false,
                    message: `Tidak ada produk dengan nama "${name}"`,
                },
            };
        }
        return {
            ok: true,
            result: {
                found: true,
                products: rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    price: Number(r.price),
                    stock: r.stock,
                })),
            },
        };
    }
    async getOrderStatus(orderId) {
        const id = Number(orderId);
        if (!id)
            return { ok: false, error: 'Parameter orderId diperlukan' };
        const order = await this.prisma.orders.findUnique({
            where: { id },
            select: {
                id: true,
                type: true,
                name: true,
                status: true,
                payment_method: true,
                created_at: true,
            },
        });
        if (!order) {
            return {
                ok: true,
                result: { found: false, message: `Order #${id} tidak ditemukan` },
            };
        }
        const items = await this.prisma.order_items.findMany({
            where: { order_id: id },
            select: { name: true, price: true, qty: true },
        });
        const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
        return {
            ok: true,
            result: { found: true, order: { ...order, items, total } },
        };
    }
    async listOpenOrders(limit = 10) {
        const safeLimit = Math.min(Number(limit) || 10, 50);
        const orders = await this.prisma.orders.findMany({
            where: {
                status: { notIn: ['cancelled', 'completed', 'refunded'] },
            },
            orderBy: { created_at: 'desc' },
            take: safeLimit,
            select: {
                id: true,
                name: true,
                type: true,
                status: true,
                created_at: true,
            },
        });
        return { ok: true, result: { orders, count: orders.length } };
    }
    async getDailySalesSummary() {
        const today = new Date().toISOString().slice(0, 10);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT o.id) AS order_count, COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')`, today);
        const topItems = await this.prisma.$queryRawUnsafe(`SELECT oi.name, SUM(oi.qty) AS units, SUM(oi.price * oi.qty) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')
       GROUP BY oi.name ORDER BY revenue DESC LIMIT 5`, today);
        const summary = rows[0] ?? { order_count: 0, revenue: 0 };
        return {
            ok: true,
            result: {
                date: today,
                orderCount: Number(summary.order_count),
                revenue: Number(summary.revenue),
                topItems: topItems.map((i) => ({
                    name: i.name,
                    units: Number(i.units),
                    revenue: Number(i.revenue),
                })),
            },
        };
    }
    async searchCustomerHistory(phone) {
        if (!phone)
            return { ok: false, error: 'Parameter phone diperlukan' };
        const digits = String(phone).replace(/\D/g, '');
        const orders = await this.prisma.$queryRawUnsafe(`SELECT o.id, o.type, o.status, o.created_at, SUM(oi.price * oi.qty) AS total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.phone = ? OR o.name = ?
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`, digits, digits);
        return {
            ok: true,
            result: {
                phone: digits,
                orders: orders.map((o) => ({ ...o, total: Number(o.total) })),
                count: orders.length,
            },
        };
    }
};
exports.LlmToolsService = LlmToolsService;
exports.LlmToolsService = LlmToolsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], LlmToolsService);
//# sourceMappingURL=llm-tools.service.js.map