import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../../modules/auth/auth.service';
import { AuthUser } from '../../modules/auth/auth.types';
import { AppConfigService } from '../../infrastructure/config/app-config.service';

/**
 * JwtAuthGuard
 *
 * Handles two auth paths in order:
 *   1. X-Api-Key header  → service-to-service (bot, worker, dashboard backend)
 *   2. Authorization: Bearer <jwt>  → human users (dashboard UI, pos-web)
 *
 * Routes decorated with @Public() bypass this guard entirely.
 * AUTH_DISABLED=true in .env bypasses for local development.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() routes through
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Dev bypass
    if (this.config.isAuthDisabled) {
      const req = context.switchToHttp().getRequest();
      req.user = {
        actor: 'dev-user',
        role: 'owner',
        storeId: 'default-store',
        tenantId: 'default',
        channel: 'api',
      } satisfies AuthUser;
      return true;
    }

    const req = context.switchToHttp().getRequest();

    // API-key path (service-to-service)
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const identity = this.authService.validateApiKey(apiKey);
      if (!identity) {
        this.logger.warn(`Invalid API key from ${req.ip}`);
        throw new UnauthorizedException('Invalid API key');
      }
      // Override storeId from header if provided
      req.user = {
        ...identity,
        storeId: req.headers['x-store-id'] ?? identity.storeId,
      };
      return true;
    }

    // JWT Bearer path — delegate to Passport
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<T = AuthUser>(err: any, user: T): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
