import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

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
