import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export type UserRole =
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'inventory_staff'
  | 'support'
  | 'bot_service'
  | 'worker_service'
  | 'llm_service';

export interface JwtPayload {
  sub: string; // user id or service actor
  email?: string;
  role: UserRole;
  storeId: string;
  tenantId: string;
  channel: 'api' | 'bot' | 'dashboard' | 'worker';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  actor: string;
  email?: string;
  role: UserRole;
  storeId: string;
  tenantId: string;
  channel: 'api' | 'bot' | 'dashboard' | 'worker';
}

export type LoginMode = 'operator' | 'manager' | 'owner';

/** Roles allowed per login mode */
export const LOGIN_MODE_ROLES: Record<LoginMode, UserRole[]> = {
  operator: ['cashier', 'inventory_staff', 'support'],
  manager: ['manager'],
  owner: ['owner'],
};

/** Human-readable mode label for error messages */
export const LOGIN_MODE_LABEL: Record<LoginMode, string> = {
  operator: 'Operator',
  manager: 'Manager',
  owner: 'Owner',
};

/**
 * LoginDto — validated by the global ValidationPipe.
 * Bad requests (missing email/password) return 400 before hitting the service.
 */
export class LoginDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'password must not be empty' })
  password!: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsIn(['operator', 'manager', 'owner'], {
    message: 'loginMode must be operator, manager, or owner',
  })
  loginMode?: LoginMode;
}

export class RefreshDto {
  @IsString()
  @MinLength(1, { message: 'refreshToken must not be empty' })
  refreshToken!: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    storeId: string;
    tenantId: string;
  };
}
