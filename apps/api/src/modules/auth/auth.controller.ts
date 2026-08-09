import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Patch,
  Param,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, UserRole } from './auth.types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './auth.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEmail, IsString, IsOptional, IsIn, IsBoolean, IsNumber, Min, Max, MinLength } from 'class-validator';

class RegisterDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  storeName!: string;

  @IsString()
  businessVertical!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  taxEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsIn(['inclusive', 'exclusive'])
  taxMode?: 'inclusive' | 'exclusive';

  @IsOptional()
  @IsBoolean()
  serviceChargeEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceChargeRate?: number;
}

// Roles a store owner may assign via POST/PATCH /auth/users. 'support' is
// deliberately excluded: it is a platform-wide role with cross-tenant access
// (see SupportModule / usePermissions.isSupport) and must never be grantable
// by a merchant — only provisioned directly (seed/ops), never through this
// store-scoped endpoint.
const VALID_ROLES: UserRole[] = [
  'owner',
  'manager',
  'cashier',
  'inventory_staff',
];

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsIn(VALID_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsString()
  storeId?: string;
}

class UpdateUserRoleDto {
  @IsIn(VALID_ROLES)
  role!: UserRole;

  @IsOptional()
  @IsString()
  storeId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Owner self-registration — creates user + store, returns tokens.
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(dto);
    } catch (err: any) {
      throw new ForbiddenException(err?.message ?? 'Pendaftaran gagal');
    }
  }

  /**
   * POST /api/auth/login
   * Human login — returns access + refresh tokens.
   * @Public() — must be reachable before a token exists.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/refresh
   * Exchange a refresh token for a new access token.
   * @Public() — the caller has no valid access token at this point.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * GET /api/auth/me
   * Returns the current authenticated user's identity.
   * Protected — requires a valid JWT or API key.
   */
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      actor: user.actor,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      tenantId: user.tenantId,
      channel: user.channel,
    };
  }

  /**
   * POST /api/auth/users
   * Create a new user account with a specific role.
   * Only owner can create users.
   *
   * Phase 9: User management endpoint.
   */
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.authService.createUser({
      email: dto.email,
      password: dto.password,
      role: dto.role ?? 'cashier',
      storeId: dto.storeId ?? actor.storeId,
    });
  }

  /**
   * GET /api/auth/users
   * List users in the same store.
   * Owner and manager can list users.
   *
   * Phase 9: User management endpoint.
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async listUsers(@CurrentUser() actor: AuthUser) {
    return this.authService.listUsers(actor.storeId);
  }

  /**
   * PATCH /api/auth/users/:id/role
   * Update a user's role and/or store assignment.
   * Only owner can change roles.
   *
   * Phase 9: User management endpoint.
   */
  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  async updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    // Owner can only manage users in their own store
    return this.authService.updateUserRole(id, {
      role: dto.role,
      storeId: dto.storeId ?? actor.storeId,
      actorStoreId: actor.storeId,
    });
  }
}
