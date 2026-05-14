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
var ReadModelService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadModelService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const ALL_PROJECTION_NAMES = [
    'daily_revenue',
    'monthly_revenue',
    'top_products',
    'payment_mix',
    'stock_alerts',
    'open_orders',
    'bot_conversation_counts',
];
let ReadModelService = ReadModelService_1 = class ReadModelService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ReadModelService_1.name);
    }
    async onModuleInit() {
        this.rebuildAll().catch((err) => {
            this.logger.warn(`Initial projection rebuild failed: ${err.message}`);
        });
    }
    async rebuild(projectionName) {
        const targets = projectionName ? [projectionName] : ALL_PROJECTION_NAMES;
        for (const name of targets) {
            try {
                const data = await this.buildProjection(name);
                const now = new Date().toISOString();
                await this.prisma.report_snapshots.upsert({
                    where: { projection: name },
                    update: { payload: JSON.stringify(data), built_at: now },
                    create: {
                        projection: name,
                        payload: JSON.stringify(data),
                        built_at: now,
                    },
                });
                this.logger.debug(`Projection rebuilt: ${name} (${Array.isArray(data) ? data.length : 1} rows)`);
            }
            catch (err) {
                this.logger.warn(`Projection rebuild failed: ${name} — ${err.message}`);
            }
        }
    }
    async rebuildAll() {
        return this.rebuild();
    }
    async get(projectionName) {
        const row = await this.prisma.report_snapshots.findUnique({
            where: { projection: projectionName },
        });
        if (!row)
            return null;
        try {
            return { data: JSON.parse(row.payload), builtAt: row.built_at };
        }
        catch {
            return null;
        }
    }
    async getAll() {
        const rows = await this.prisma.report_snapshots.findMany();
        const result = {};
        for (const row of rows) {
            try {
                result[row.projection] = {
                    data: JSON.parse(row.payload),
                    builtAt: row.built_at,
                };
            }
            catch {
            }
        }
        return result;
    }
    async buildProjection(name) {
        switch (name) {
            case 'daily_revenue':
                return this.prisma.$queryRawUnsafe(`
          SELECT DATE(o.created_at) AS date, COUNT(o.id) AS order_count,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
          FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status NOT IN ('cancelled','refunded')
          GROUP BY DATE(o.created_at) ORDER BY date DESC LIMIT 30
        `);
            case 'monthly_revenue':
                return this.prisma.$queryRawUnsafe(`
          SELECT strftime('%Y-%m', o.created_at) AS month, COUNT(o.id) AS order_count,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
          FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status NOT IN ('cancelled','refunded')
          GROUP BY strftime('%Y-%m', o.created_at) ORDER BY month DESC LIMIT 12
        `);
            case 'top_products':
                return this.prisma.$queryRawUnsafe(`
          SELECT m.id, m.name, SUM(oi.qty) AS units_sold,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
          FROM order_items oi JOIN menu m ON m.id = oi.menu_id
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status NOT IN ('cancelled','refunded')
            AND DATE(o.created_at) >= DATE('now', '-30 days')
          GROUP BY m.id ORDER BY revenue DESC LIMIT 10
        `);
            case 'payment_mix':
                return this.prisma.$queryRawUnsafe(`
          SELECT payment_method, COUNT(*) AS order_count,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
          FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status NOT IN ('cancelled','refunded')
            AND DATE(o.created_at) >= DATE('now', '-30 days')
          GROUP BY payment_method
        `);
            case 'stock_alerts':
                return this.prisma.menu.findMany({
                    where: { stock: { lte: 5 } },
                    orderBy: { stock: 'asc' },
                    select: { id: true, name: true, stock: true },
                });
            case 'open_orders':
                return this.prisma.$queryRawUnsafe(`
          SELECT o.id, o.name, o.type, o.status, o.created_at,
                 COUNT(oi.id) AS item_count,
                 COALESCE(SUM(oi.price * oi.qty), 0) AS total
          FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status NOT IN ('cancelled','completed','refunded')
          GROUP BY o.id ORDER BY o.created_at ASC
        `);
            case 'bot_conversation_counts':
                return this.prisma.$queryRawUnsafe(`
          SELECT DATE(created_at) AS date,
                 COUNT(DISTINCT sender) AS unique_senders,
                 COUNT(*) AS message_count
          FROM chat_history
          WHERE DATE(created_at) >= DATE('now', '-7 days')
          GROUP BY DATE(created_at) ORDER BY date DESC
        `);
            default:
                throw new Error(`Unknown projection: ${name}`);
        }
    }
};
exports.ReadModelService = ReadModelService;
exports.ReadModelService = ReadModelService = ReadModelService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], ReadModelService);
//# sourceMappingURL=read-model.service.js.map