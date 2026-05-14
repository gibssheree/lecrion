import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get fonnteToken(): string {
    return this.configService.get<string>('FONNTE_TOKEN') || '';
  }

  get geminiApiKey(): string {
    return this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  get geminiModel(): string {
    return this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  get port(): number {
    return this.configService.get<number>('PORT') || 3000;
  }

  get defaultOrderType(): string {
    return this.configService.get<string>('DEFAULT_ORDER_TYPE') || 'pickup';
  }

  get defaultPaymentMethod(): string {
    return this.configService.get<string>('DEFAULT_PAYMENT_METHOD') || 'Cash';
  }

  get defaultStoreId(): string {
    return (
      this.configService.get<string>('DEFAULT_STORE_ID') || 'default-store'
    );
  }

  get defaultTenantId(): string {
    return this.configService.get<string>('DEFAULT_TENANT_ID') || 'default';
  }

  get jwtSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET') ||
      'lecrion_jwt_secret_change_in_production'
    );
  }

  get jwtRefreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'lecrion_refresh_secret_change_in_production'
    );
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  get botApiKey(): string {
    return this.configService.get<string>('BOT_API_KEY') || '__bot_key__';
  }

  get workerApiKey(): string {
    return this.configService.get<string>('WORKER_API_KEY') || '__worker_key__';
  }

  get dashboardApiKey(): string {
    return (
      this.configService.get<string>('DASHBOARD_API_KEY') || '__dash_key__'
    );
  }

  get isAuthDisabled(): boolean {
    return this.configService.get<string>('AUTH_DISABLED') === 'true';
  }

  get groupCommandPrefix(): string {
    return this.configService.get<string>('GROUP_COMMAND_PREFIX') || '!';
  }

  get fonnteWebhookSecret(): string {
    return this.configService.get<string>('FONNTE_WEBHOOK_SECRET') || '';
  }

  get groupReplyOnlyWhenTagged(): boolean {
    return (
      this.configService.get<string>('GROUP_REPLY_ONLY_WHEN_TAGGED') !== 'false'
    );
  }

  get groupAllowPrefixCommand(): boolean {
    return (
      this.configService.get<string>('GROUP_ALLOW_PREFIX_COMMAND') !== 'false'
    );
  }

  get groupAllowReplyFollowUp(): boolean {
    return (
      this.configService.get<string>('GROUP_ALLOW_REPLY_FOLLOWUP') !== 'false'
    );
  }

  get groupTagAliases(): string[] {
    const raw = this.configService.get<string>('GROUP_TAG_ALIASES') || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get groupTagKeywords(): string[] {
    const raw = this.configService.get<string>('GROUP_TAG_KEYWORDS') || '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
