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
var ReportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const enums_1 = require("../../../../../libs/contracts/src/enums");
function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
const REVENUE_STATUSES = [
    enums_1.OrderStatus.COMPLETED,
    enums_1.OrderStatus.PAID,
    enums_1.OrderStatus.CONFIRMED,
];
const REVENUE_STATUS_SQL = REVENUE_STATUSES.map((s) => `'${s}'`).join(',');
const CLOSED_STATUS_SQL = [
    enums_1.OrderStatus.CANCELLED,
    enums_1.OrderStatus.COMPLETED,
    enums_1.OrderStatus.REFUNDED,
]
    .map((s) => `'${s}'`)
    .join(',');
let ReportsService = ReportsService_1 = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReportsService_1.name);
    }
    async getSalesSummary() {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue,
        COALESCE(SUM(oi.qty * oi.price) / NULLIF(COUNT(DISTINCT o.id), 0), 0) AS avg_order_value
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
    `);
        const row = rows[0] ?? {};
        return {
            totalOrders: toNumber(row.total_orders),
            totalItems: toNumber(row.total_items),
            totalRevenue: toNumber(row.total_revenue),
            averageOrderValue: toNumber(row.avg_order_value),
        };
    }
    async getSalesByPayment() {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        o.payment_method,
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
      GROUP BY o.payment_method
      ORDER BY total_sales DESC
    `);
        return rows.map((r) => ({
            paymentMethod: r.payment_method || '-',
            totalSales: toNumber(r.total_sales),
            totalItems: toNumber(r.total_items),
            totalRevenue: toNumber(r.total_revenue),
        }));
    }
    async getSalesByType() {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        o.type AS order_type,
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
      GROUP BY o.type
      ORDER BY total_sales DESC
    `);
        return rows.map((r) => ({
            orderType: r.order_type || '-',
            totalSales: toNumber(r.total_sales),
            totalItems: toNumber(r.total_items),
            totalRevenue: toNumber(r.total_revenue),
        }));
    }
    async getSalesDaily(limit = 14) {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 14;
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        strftime('%Y-%m-%d', o.created_at) AS sales_date,
        COUNT(DISTINCT o.id) AS total_sales,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
      GROUP BY strftime('%Y-%m-%d', o.created_at)
      ORDER BY sales_date DESC
      LIMIT ?`, safeLimit);
        return rows.map((r) => ({
            salesDate: r.sales_date,
            totalSales: toNumber(r.total_sales),
            totalItems: toNumber(r.total_items),
            totalRevenue: toNumber(r.total_revenue),
        }));
    }
    async getSalesForDate(dateValue) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND strftime('%Y-%m-%d', o.created_at) = strftime('%Y-%m-%d', ?)`, dateValue);
        const row = rows[0] ?? {};
        return {
            totalOrders: toNumber(row.total_orders),
            totalItems: toNumber(row.total_items),
            totalRevenue: toNumber(row.total_revenue),
        };
    }
    async getSalesForYear(yearValue) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND strftime('%Y', o.created_at) = ?`, String(yearValue));
        const row = rows[0] ?? {};
        return {
            totalOrders: toNumber(row.total_orders),
            totalItems: toNumber(row.total_items),
            totalRevenue: toNumber(row.total_revenue),
        };
    }
    async getSalesForMonth(yearValue, monthValue) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND strftime('%Y', o.created_at) = ?
        AND strftime('%m', o.created_at) = ?`, String(yearValue), String(monthValue).padStart(2, '0'));
        const row = rows[0] ?? {};
        return {
            totalOrders: toNumber(row.total_orders),
            totalItems: toNumber(row.total_items),
            totalRevenue: toNumber(row.total_revenue),
        };
    }
    async getSalesMonthlyBreakdown(yearValue) {
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        CAST(strftime('%m', o.created_at) AS INTEGER) AS month_number,
        COUNT(DISTINCT o.id) AS total_orders,
        COALESCE(SUM(oi.qty), 0) AS total_items,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN (${REVENUE_STATUS_SQL})
        AND strftime('%Y', o.created_at) = ?
      GROUP BY strftime('%m', o.created_at)
      ORDER BY month_number ASC`, String(yearValue));
        return rows.map((r) => ({
            monthNumber: toNumber(r.month_number),
            totalOrders: toNumber(r.total_orders),
            totalItems: toNumber(r.total_items),
            totalRevenue: toNumber(r.total_revenue),
        }));
    }
    async getSalesTopProducts(options = {}) {
        const { year, month, limit = 5 } = options;
        const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
        const conditions = [`o.status IN (${REVENUE_STATUS_SQL})`];
        const params = [];
        if (Number.isInteger(year)) {
            conditions.push("strftime('%Y', o.created_at) = ?");
            params.push(String(year));
        }
        if (Number.isInteger(month)) {
            conditions.push("strftime('%m', o.created_at) = ?");
            params.push(String(month).padStart(2, '0'));
        }
        params.push(safeLimit);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT
        oi.menu_id,
        oi.name,
        COALESCE(SUM(oi.qty), 0) AS total_qty,
        COALESCE(SUM(oi.qty * oi.price), 0) AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY oi.menu_id, oi.name
      ORDER BY total_qty DESC, total_revenue DESC
      LIMIT ?`, ...params);
        return rows.map((r) => ({
            menuId: toNumber(r.menu_id),
            name: r.name,
            totalQty: toNumber(r.total_qty),
            totalRevenue: toNumber(r.total_revenue),
        }));
    }
    async getStockChangeLogs(limit = 30) {
        const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 30;
        try {
            const rows = await this.prisma.$queryRawUnsafe(`SELECT
          scl.id, scl.menu_id, m.name AS menu_name, scl.admin_id,
          scl.order_id, scl.change_type, scl.qty_before, scl.qty_change, scl.qty_after, scl.note, scl.created_at
        FROM stock_change_logs scl
        LEFT JOIN menu m ON m.id = scl.menu_id
        ORDER BY scl.created_at DESC, scl.id DESC
        LIMIT ?`, safeLimit);
            return rows.map((r) => ({
                id: toNumber(r.id),
                menuId: toNumber(r.menu_id),
                menuName: r.menu_name || '-',
                adminId: r.admin_id ? toNumber(r.admin_id) : null,
                orderId: r.order_id ? toNumber(r.order_id) : null,
                changeType: r.change_type,
                qtyBefore: toNumber(r.qty_before),
                qtyChange: toNumber(r.qty_change),
                qtyAfter: toNumber(r.qty_after),
                note: r.note || '',
                createdAt: r.created_at,
            }));
        }
        catch (err) {
            this.logger.warn(`getStockChangeLogs error: ${err.message}`);
            return [];
        }
    }
    async getYearDetailBundle(year) {
        const [yearSales, monthlyBreakdown, topProducts] = await Promise.all([
            this.getSalesForYear(year),
            this.getSalesMonthlyBreakdown(year),
            this.getSalesTopProducts({ year, limit: 10 }),
        ]);
        return { yearSales, monthlyBreakdown, topProducts };
    }
    async getMonthDetailBundle(year, month) {
        const [monthSales, topProducts] = await Promise.all([
            this.getSalesForMonth(year, month),
            this.getSalesTopProducts({ year, month, limit: 8 }),
        ]);
        return { monthSales, topProducts };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = ReportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map