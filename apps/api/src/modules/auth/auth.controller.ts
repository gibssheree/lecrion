import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.types';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
