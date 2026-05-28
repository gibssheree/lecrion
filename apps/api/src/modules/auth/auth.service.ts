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
  LoginMode,
  LOGIN_MODE_ROLES,
  LOGIN_MODE_LABEL,
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
   * Phase 9: Reads role and store_id from the users table.
   * Existing rows were backfilled to 'owner' by migration.
   * New accounts default to 'cashier' (least-privilege).
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

    // Phase 9: read role and store_id from DB; fall back to safe defaults
    const role = ((user as any).role as UserRole) ?? 'cashier';
    const storeId = (user as any).store_id ?? this.config.defaultStoreId;

    return {
      actor: String(user.id),
      email: user.email,
      role,
      storeId,
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
      throw new UnauthorizedException('Email atau password salah');
    }

    // Validate role against loginMode when provided
    if (dto.loginMode) {
      const allowedRoles = LOGIN_MODE_ROLES[dto.loginMode as LoginMode];
      if (!allowedRoles.includes(user.role)) {
        const modeLabel = LOGIN_MODE_LABEL[dto.loginMode as LoginMode];
        throw new UnauthorizedException(`Akun ini bukan akses ${modeLabel}.`);
      }
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

  // ─── Self-registration ───────────────────────────────────────────────────────

  /**
   * Owner self-registration — creates account + store in one atomic flow.
   * Returns access + refresh tokens so the user is immediately logged in.
   */
  async register(params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    storeName: string;
    businessVertical: string;
    city?: string;
    taxEnabled?: boolean;
    taxRate?: number;
    taxMode?: 'inclusive' | 'exclusive';
    serviceChargeEnabled?: boolean;
    serviceChargeRate?: number;
  }): Promise<LoginResult> {
    const existing = await this.prisma.users.findUnique({
      where: { email: params.email },
    });
    if (existing) {
      throw new Error(`Email '${params.email}' sudah terdaftar.`);
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const now = new Date().toISOString();
    const storeId = `store-${Date.now()}`;

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Create owner user
      await tx.users.create({
        data: {
          email: params.email,
          password_hash: passwordHash,
          role: 'owner',
          store_id: storeId,
          created_at: now,
          updated_at: now,
        },
      });

      // 2. Store settings
      const settings: Array<{ key: string; value: string }> = [
        { key: `${storeId}:storeName`, value: params.storeName },
        { key: `${storeId}:businessVertical`, value: params.businessVertical },
        { key: `${storeId}:ownerName`, value: params.name },
        { key: `${storeId}:ownerPhone`, value: params.phone },
      ];
      if (params.city) {
        settings.push({ key: `${storeId}:city`, value: params.city });
      }
      if (params.taxEnabled) {
        settings.push(
          {
            key: `${storeId}:calc.tax_rate`,
            value: String(params.taxRate ?? 11),
          },
          {
            key: `${storeId}:calc.tax_mode`,
            value: params.taxMode ?? 'inclusive',
          },
        );
      }
      if (params.serviceChargeEnabled) {
        settings.push({
          key: `${storeId}:calc.service_charge_rate`,
          value: String(params.serviceChargeRate ?? 5),
        });
      }

      // SQLite does not support createMany with skipDuplicates.
      // Use individual upserts instead.
      for (const s of settings) {
        await tx.store_settings.upsert({
          where: { key: s.key },
          create: { key: s.key, value: s.value, updated_at: now },
          update: { value: s.value, updated_at: now },
        });
      }

      // 3. Store business profile
      await tx.store_business_profiles.create({
        data: {
          store_id: storeId,
          requested_business_vertical: params.businessVertical,
          verified_business_vertical: params.businessVertical,
          verification_status: 'auto_approved',
          verified_at: now,
          notes: 'Auto-approved on self-registration',
        } as any,
      });
    });

    this.logger.log(
      `Self-register: email=${params.email} store=${storeId} vertical=${params.businessVertical}`,
    );

    // Issue tokens immediately — user is logged in right after register
    const authUser: AuthUser = {
      actor: params.email,
      email: params.email,
      role: 'owner',
      storeId,
      tenantId: this.config.defaultTenantId,
      channel: 'api',
    };

    // Re-fetch the actual user id for the token sub
    const created = await this.prisma.users.findUnique({
      where: { email: params.email },
    });
    if (created) authUser.actor = String(created.id);

    const tokens = await this.issueTokens(authUser);

    return {
      ...tokens,
      user: {
        id: authUser.actor,
        email: authUser.email!,
        role: 'owner',
        storeId,
        tenantId: authUser.tenantId,
      },
    };
  }

  // ─── Phase 9: User management ────────────────────────────────────────────────

  /**
   * Create a new user with a specific role and store assignment.
   * Only callable by owner-role users (enforced at controller level).
   */
  async createUser(params: {
    email: string;
    password: string;
    role: UserRole;
    storeId: string;
  }): Promise<{ id: number; email: string; role: string; storeId: string }> {
    const existing = await this.prisma.users.findUnique({
      where: { email: params.email },
    });
    if (existing) {
      throw new Error(`User with email '${params.email}' already exists`);
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const now = new Date().toISOString();

    const user = await this.prisma.users.create({
      data: {
        email: params.email,
        password_hash: passwordHash,
        role: params.role,
        store_id: params.storeId,
        created_at: now,
        updated_at: now,
      } as any,
    });

    this.logger.log(
      `User created: email=${params.email} role=${params.role} store=${params.storeId}`,
    );

    return {
      id: user.id,
      email: user.email,
      role: (user as any).role,
      storeId: (user as any).store_id,
    };
  }

  /**
   * List users belonging to a specific store.
   * Passwords are never returned.
   */
  async listUsers(storeId: string): Promise<
    Array<{
      id: number;
      email: string;
      role: string;
      storeId: string;
      createdAt: string;
    }>
  > {
    const users = await this.prisma.users.findMany({
      where: { store_id: storeId } as any,
      orderBy: { created_at: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: (u as any).role ?? 'cashier',
      storeId: (u as any).store_id ?? storeId,
      createdAt: u.created_at,
    }));
  }

  /**
   * Update a user's role and/or store assignment.
   * Validates that the target user belongs to the actor's store.
   */
  async updateUserRole(
    userId: number,
    params: { role: UserRole; storeId: string; actorStoreId: string },
  ): Promise<{ id: number; email: string; role: string; storeId: string }> {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User #${userId} not found`);
    }

    // Owners can only manage users in their own store
    const userStoreId = (user as any).store_id ?? 'default-store';
    if (userStoreId !== params.actorStoreId) {
      throw new Error(
        `Cannot manage user from store '${userStoreId}' — you belong to '${params.actorStoreId}'`,
      );
    }

    const updated = await this.prisma.users.update({
      where: { id: userId },
      data: {
        role: params.role,
        store_id: params.storeId,
        updated_at: new Date().toISOString(),
      } as any,
    });

    this.logger.log(
      `User #${userId} role updated: ${(user as any).role} → ${params.role}`,
    );

    return {
      id: updated.id,
      email: updated.email,
      role: (updated as any).role,
      storeId: (updated as any).store_id,
    };
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
