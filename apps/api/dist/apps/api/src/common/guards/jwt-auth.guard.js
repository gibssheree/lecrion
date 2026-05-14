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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../decorators/public.decorator");
const auth_service_1 = require("../../modules/auth/auth.service");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector, authService, config) {
        super();
        this.reflector = reflector;
        this.authService = authService;
        this.config = config;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        if (this.config.isAuthDisabled) {
            const req = context.switchToHttp().getRequest();
            req.user = {
                actor: 'dev-user',
                role: 'owner',
                storeId: 'default-store',
                tenantId: 'default',
                channel: 'api',
            };
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            const identity = this.authService.validateApiKey(apiKey);
            if (!identity) {
                this.logger.warn(`Invalid API key from ${req.ip}`);
                throw new common_1.UnauthorizedException('Invalid API key');
            }
            req.user = {
                ...identity,
                storeId: req.headers['x-store-id'] ?? identity.storeId,
            };
            return true;
        }
        return super.canActivate(context);
    }
    handleRequest(err, user) {
        if (err || !user) {
            throw err ?? new common_1.UnauthorizedException('Authentication required');
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        auth_service_1.AuthService,
        app_config_service_1.AppConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map