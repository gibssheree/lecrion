import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@libs/db/src/prisma';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { AuthUser, LoginDto, LoginResult } from './auth.types';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, config: AppConfigService);
    validateApiKey(apiKey: string): AuthUser | null;
    validateUser(email: string, password: string): Promise<AuthUser | null>;
    login(dto: LoginDto): Promise<LoginResult>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    hashPassword(plain: string): Promise<string>;
    private issueTokens;
}
