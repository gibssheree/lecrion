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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
const buildServiceKeys = (config) => ({
    [config.botApiKey]: {
        actor: 'bot-service',
        role: 'bot_service',
        storeId: 'default-store',
        tenantId: 'default',
        channel: 'bot',
    },
    [config.workerApiKey]: {
        actor: 'worker-service',
        role: 'worker_service',
        storeId: 'default-store',
        tenantId: 'default',
        channel: 'worker',
    },
    [config.dashboardApiKey]: {
        actor: 'dashboard',
        role: 'manager',
        storeId: 'default-store',
        tenantId: 'default',
        channel: 'dashboard',
    },
});
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    validateApiKey(apiKey) {
        const keys = buildServiceKeys(this.config);
        return keys[apiKey] ?? null;
    }
    async validateUser(email, password) {
        if (!email || !password)
            return null;
        const user = await this.prisma.users.findUnique({ where: { email } });
        if (!user)
            return null;
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return null;
        return {
            actor: String(user.id),
            email: user.email,
            role: 'owner',
            storeId: this.config.defaultStoreId,
            tenantId: this.config.defaultTenantId,
            channel: 'api',
        };
    }
    async login(dto) {
        const user = await this.validateUser(dto.email, dto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const storeId = dto.storeId || user.storeId;
        const tokens = await this.issueTokens({ ...user, storeId });
        this.logger.log(`Login: ${user.email} [${user.role}] store=${storeId}`);
        return {
            ...tokens,
            user: {
                id: user.actor,
                email: user.email,
                role: user.role,
                storeId,
                tenantId: user.tenantId,
            },
        };
    }
    async refresh(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.config.jwtRefreshSecret,
            });
            const accessToken = this.jwtService.sign({
                sub: payload.sub,
                email: payload.email,
                role: payload.role,
                storeId: payload.storeId,
                tenantId: payload.tenantId,
                channel: payload.channel,
            }, { expiresIn: this.config.jwtExpiresIn });
            return { accessToken };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async hashPassword(plain) {
        return bcrypt.hash(plain, 10);
    }
    async issueTokens(user) {
        const base = {
            sub: user.actor,
            email: user.email,
            role: user.role,
            storeId: user.storeId,
            tenantId: user.tenantId,
            channel: user.channel,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(base, {
                expiresIn: this.config.jwtExpiresIn,
            }),
            this.jwtService.signAsync(base, {
                secret: this.config.jwtRefreshSecret,
                expiresIn: this.config.jwtRefreshExpiresIn,
            }),
        ]);
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_1.PrismaService,
        jwt_1.JwtService,
        app_config_service_1.AppConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map