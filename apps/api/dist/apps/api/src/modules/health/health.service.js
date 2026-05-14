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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const metrics_1 = require("../../../../../libs/common/src/telemetry/metrics");
let HealthService = HealthService_1 = class HealthService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(HealthService_1.name);
        this.startTime = Date.now();
    }
    async check() {
        const checks = {};
        let status = 'ok';
        const dbStart = Date.now();
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            checks['db'] = { status: 'ok', latencyMs: Date.now() - dbStart };
        }
        catch (err) {
            checks['db'] = {
                status: 'fail',
                latencyMs: Date.now() - dbStart,
                error: err.message,
            };
            status = 'unhealthy';
            this.logger.error(`Health check DB failed: ${err.message}`);
        }
        const outboxStart = Date.now();
        try {
            const pending = await this.prisma.sync_outbox.count({
                where: { status: 'pending' },
            });
            const dead = await this.prisma.sync_outbox.count({
                where: { status: 'dead' },
            });
            checks['outbox'] = {
                status: dead > 10 ? 'fail' : 'ok',
                latencyMs: Date.now() - outboxStart,
                ...(dead > 0 ? { error: `${dead} dead-letter events` } : {}),
            };
            if (dead > 10 && status === 'ok')
                status = 'degraded';
            checks['outbox'].pending = pending;
            checks['outbox'].dead = dead;
        }
        catch (err) {
            checks['outbox'] = {
                status: 'fail',
                latencyMs: Date.now() - outboxStart,
                error: err.message,
            };
            if (status === 'ok')
                status = 'degraded';
        }
        const idempStart = Date.now();
        try {
            const expired = await this.prisma.idempotency_keys.count({
                where: { expires_at: { lt: new Date().toISOString() } },
            });
            checks['idempotency'] = {
                status: 'ok',
                latencyMs: Date.now() - idempStart,
            };
            checks['idempotency'].expiredKeys = expired;
        }
        catch (err) {
            checks['idempotency'] = {
                status: 'fail',
                latencyMs: Date.now() - idempStart,
                error: err.message,
            };
        }
        const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
        return {
            status,
            service: 'api',
            version: process.env['npm_package_version'] ?? '1.0.0',
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memoryMb: memMb,
            timestamp: new Date().toISOString(),
            checks,
        };
    }
    metrics() {
        return (0, metrics_1.renderMetrics)();
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map