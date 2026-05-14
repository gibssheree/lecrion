import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@libs/db/src/prisma';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import {
  JwtPayload,
  AuthUser,
  LoginDto,
  LoginResult,
  UserRole,
} from './auth.types';

// Internal service API keys — maps key → identity
// In production these come from DB or secret manager
const buildServiceKeys = (
  config: AppConfigService,
): Record<string, AuthUser> => ({
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Validate an API key (service-to-service auth).
   * Returns the AuthUser identity or null.
   */
  validateApiKey(apiKey: string): AuthUser | null {
    const keys = buildServiceKeys(this.config);
    return keys[apiKey] ?? null;
  }

  /**
   * Validate email + password for human login.
   *
   * NOTE: The `users` table has no `role` column yet.
   * All human logins default to 'owner' until a roles column is added
   * to the schema (tracked in Phase 3 / P3-1).
   * The `admins` table is a legacy table — new logins use `users`.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    if (!email || !password) return null;
    const user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    return {
      actor: String(user.id),
      email: user.email,
      role: 'owner', // TODO: read from users.role once column is added
      storeId: this.config.defaultStoreId,
      tenantId: this.config.defaultTenantId,
      channel: 'api',
    };
  }

  /**
   * Issue access + refresh token pair.
   */
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const storeId = dto.storeId || user.storeId;
    const tokens = await this.issueTokens({ ...user, storeId });

    this.logger.log(`Login: ${user.email} [${user.role}] store=${storeId}`);

    return {
      ...tokens,
      user: {
        id: user.actor,
        email: user.email!,
        role: user.role,
        storeId,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.jwtRefreshSecret,
      });

      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          storeId: payload.storeId,
          tenantId: payload.tenantId,
          channel: payload.channel,
        } as Omit<JwtPayload, 'iat' | 'exp'>,
        { expiresIn: this.config.jwtExpiresIn as any },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Hash a plain password (for user creation/reset).
   */
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    user: AuthUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const base: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.actor,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      tenantId: user.tenantId,
      channel: user.channel,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(base as any, {
        expiresIn: this.config.jwtExpiresIn as any,
      }),
      this.jwtService.signAsync(base as any, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshExpiresIn as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
