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
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let IdempotencyService = class IdempotencyService {
    constructor(prisma) {
        this.prisma = prisma;
        this.TTL_SECONDS = 60 * 60 * 24;
        this._lastCleanup = 0;
    }
    async maybeCleanup() {
        const now = Date.now();
        if (now - this._lastCleanup > 60_000) {
            await this.prisma.idempotency_keys.deleteMany({
                where: {
                    expires_at: {
                        lte: new Date().toISOString(),
                    },
                },
            });
            this._lastCleanup = now;
        }
    }
    async check(key) {
        if (!key)
            return null;
        await this.maybeCleanup();
        const row = await this.prisma.idempotency_keys.findFirst({
            where: {
                key,
                expires_at: {
                    gt: new Date().toISOString(),
                },
            },
        });
        if (!row)
            return null;
        try {
            return JSON.parse(row.result);
        }
        catch {
            return null;
        }
    }
    async save(key, result) {
        if (!key)
            return;
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + this.TTL_SECONDS);
        await this.prisma.idempotency_keys.upsert({
            where: { key },
            update: {
                result: JSON.stringify(result),
                expires_at: expiresAt.toISOString(),
            },
            create: {
                key,
                result: JSON.stringify(result),
                expires_at: expiresAt.toISOString(),
            },
        });
    }
    buildCheckoutKey(sender, cartItemIds) {
        const sorted = [...cartItemIds].sort().join(',');
        return `checkout:${sender}:${sorted}`;
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map