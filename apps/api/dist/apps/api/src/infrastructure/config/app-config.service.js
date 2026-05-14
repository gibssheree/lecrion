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
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    get fonnteToken() {
        return this.configService.get('FONNTE_TOKEN') || '';
    }
    get geminiApiKey() {
        return this.configService.get('GEMINI_API_KEY') || '';
    }
    get geminiModel() {
        return this.configService.get('GEMINI_MODEL') || 'gemini-2.0-flash';
    }
    get port() {
        return this.configService.get('PORT') || 3000;
    }
    get defaultOrderType() {
        return this.configService.get('DEFAULT_ORDER_TYPE') || 'pickup';
    }
    get defaultPaymentMethod() {
        return this.configService.get('DEFAULT_PAYMENT_METHOD') || 'Cash';
    }
    get defaultStoreId() {
        return (this.configService.get('DEFAULT_STORE_ID') || 'default-store');
    }
    get defaultTenantId() {
        return this.configService.get('DEFAULT_TENANT_ID') || 'default';
    }
    get jwtSecret() {
        return (this.configService.get('JWT_SECRET') ||
            'lecrion_jwt_secret_change_in_production');
    }
    get jwtRefreshSecret() {
        return (this.configService.get('JWT_REFRESH_SECRET') ||
            'lecrion_refresh_secret_change_in_production');
    }
    get jwtExpiresIn() {
        return this.configService.get('JWT_EXPIRES_IN') || '15m';
    }
    get jwtRefreshExpiresIn() {
        return this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    }
    get botApiKey() {
        return this.configService.get('BOT_API_KEY') || '__bot_key__';
    }
    get workerApiKey() {
        return this.configService.get('WORKER_API_KEY') || '__worker_key__';
    }
    get dashboardApiKey() {
        return (this.configService.get('DASHBOARD_API_KEY') || '__dash_key__');
    }
    get isAuthDisabled() {
        return this.configService.get('AUTH_DISABLED') === 'true';
    }
    get groupCommandPrefix() {
        return this.configService.get('GROUP_COMMAND_PREFIX') || '!';
    }
    get fonnteWebhookSecret() {
        return this.configService.get('FONNTE_WEBHOOK_SECRET') || '';
    }
    get groupReplyOnlyWhenTagged() {
        return (this.configService.get('GROUP_REPLY_ONLY_WHEN_TAGGED') !== 'false');
    }
    get groupAllowPrefixCommand() {
        return (this.configService.get('GROUP_ALLOW_PREFIX_COMMAND') !== 'false');
    }
    get groupAllowReplyFollowUp() {
        return (this.configService.get('GROUP_ALLOW_REPLY_FOLLOWUP') !== 'false');
    }
    get groupTagAliases() {
        const raw = this.configService.get('GROUP_TAG_ALIASES') || '';
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
    get groupTagKeywords() {
        const raw = this.configService.get('GROUP_TAG_KEYWORDS') || '';
        return raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=app-config.service.js.map