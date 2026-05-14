import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/auth.service';
import { AuthUser } from '../../modules/auth/auth.types';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    private readonly reflector;
    private readonly authService;
    private readonly config;
    private readonly logger;
    constructor(reflector: Reflector, authService: AuthService, config: AppConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    handleRequest<T = AuthUser>(err: any, user: T): T;
}
export {};
