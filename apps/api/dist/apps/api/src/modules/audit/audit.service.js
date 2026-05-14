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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_1 = require("../../../../../libs/db/src/prisma");
let AuditService = AuditService_1 = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    record(opts) {
        const { actor, action, resource, resourceId, before, after, tenantId = 'default', storeId = 'default-store', correlationId, channel = 'api' } = opts;
        this.prisma.audit_logs.create({
            data: {
                actor: String(actor),
                action: String(action),
                resource: String(resource),
                resource_id: resourceId != null ? String(resourceId) : null,
                before_value: before != null ? JSON.stringify(before) : null,
                after_value: after != null ? JSON.stringify(after) : null,
                tenant_id: String(tenantId),
                store_id: String(storeId),
                correlation_id: correlationId ? String(correlationId) : null,
                channel: String(channel),
            },
        }).catch((err) => {
            this.logger.warn(`Audit write failed: ${err.message}`, { actor, action, resource });
        });
    }
    async query(filters = {}) {
        const { actor, resource, action, limit = 50 } = filters;
        return this.prisma.audit_logs.findMany({
            where: {
                actor: actor || undefined,
                resource: resource || undefined,
                action: action || undefined,
            },
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map