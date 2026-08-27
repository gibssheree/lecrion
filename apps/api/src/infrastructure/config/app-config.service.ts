import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get fonnteToken(): string {
    return this.configService.get<string>('FONNTE_TOKEN') || '';
  }

  /**
   * The bot's own WhatsApp number (digits only, e.g. "6281234567890") — the
   * number customers text TO. Fonnte's webhook payload doesn't include this
   * (it has no "which of my numbers received this" field), so it has to be
   * configured here to build a per-store wa.me deep link. Empty until set.
   */
  get fonnteWaNumber(): string {
    return this.configService.get<string>('FONNTE_WA_NUMBER') || '';
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

  /**
   * No fallback on purpose (see SEC-02). A hardcoded default secret here
   * means anyone who reads this source can forge a valid token for any
   * account in any environment that forgets to set JWT_SECRET. Fail fast at
   * boot instead of silently signing with a known, guessable secret.
   */
  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not set. Set a real random value in .env — refusing to start with a default secret.',
      );
    }
    return secret;
  }

  get jwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not set. Set a real random value in .env — refusing to start with a default secret.',
      );
    }
    return secret;
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
