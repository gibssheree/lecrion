import { ConfigService } from '@nestjs/config';
export declare class AppConfigService {
    private configService;
    constructor(configService: ConfigService);
    get fonnteToken(): string;
    get geminiApiKey(): string;
    get geminiModel(): string;
    get port(): number;
    get defaultOrderType(): string;
    get defaultPaymentMethod(): string;
    get defaultStoreId(): string;
    get defaultTenantId(): string;
    get jwtSecret(): string;
    get jwtRefreshSecret(): string;
    get jwtExpiresIn(): string;
    get jwtRefreshExpiresIn(): string;
    get botApiKey(): string;
    get workerApiKey(): string;
    get dashboardApiKey(): string;
    get isAuthDisabled(): boolean;
    get groupCommandPrefix(): string;
    get fonnteWebhookSecret(): string;
    get groupReplyOnlyWhenTagged(): boolean;
    get groupAllowPrefixCommand(): boolean;
    get groupAllowReplyFollowUp(): boolean;
    get groupTagAliases(): string[];
    get groupTagKeywords(): string[];
}
