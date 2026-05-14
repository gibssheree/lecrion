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
var HistoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let HistoryService = HistoryService_1 = class HistoryService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(HistoryService_1.name);
    }
    async addEntry(data) {
        const now = new Date().toISOString();
        await this.prisma.chat_history
            .create({
            data: {
                sender: data.sender,
                name: data.name ?? null,
                question: data.question,
                reply: data.reply,
                type: data.type ?? 'chat',
                cart_items: data.cartItems ?? null,
                total_price: data.totalPrice ?? null,
                order_id: data.orderId ?? null,
                created_at: now,
            },
        })
            .catch((err) => {
            this.logger.warn(`History write failed: ${err.message}`);
        });
    }
    async getEntries(limit = 100) {
        return this.prisma.chat_history.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
        });
    }
    async getHistoryBySender(sender, limit = 10) {
        const rows = await this.prisma.chat_history.findMany({
            where: { sender },
            orderBy: { created_at: 'desc' },
            take: limit,
            select: { question: true, reply: true },
        });
        const reversed = [...rows].reverse();
        return reversed.flatMap((row) => [
            { role: 'user', content: row.question },
            { role: 'model', content: row.reply },
        ]);
    }
    async getRawHistoryBySender(sender, limit = 20) {
        return this.prisma.chat_history.findMany({
            where: { sender },
            orderBy: { created_at: 'desc' },
            take: limit,
        });
    }
    async clearHistory(sender) {
        if (sender) {
            await this.prisma.chat_history.deleteMany({ where: { sender } });
        }
        else {
            await this.prisma.chat_history.deleteMany({});
        }
    }
    async getConversationCounts(days = 7) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
        const rows = await this.prisma.$queryRawUnsafe(`SELECT DATE(created_at) AS date,
              COUNT(DISTINCT sender) AS unique_senders,
              COUNT(*) AS message_count
       FROM chat_history
       WHERE DATE(created_at) >= ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`, cutoff);
        return rows.map((r) => ({
            date: r.date,
            uniqueSenders: Number(r.unique_senders),
            messageCount: Number(r.message_count),
        }));
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = HistoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], HistoryService);
//# sourceMappingURL=history.service.js.map