import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.types';
import { AuthUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<import("./auth.types").LoginResult>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
    }>;
    me(user: AuthUser): {
        actor: string;
        email: string | undefined;
        role: import("./auth.types").UserRole;
        storeId: string;
        tenantId: string;
        channel: "api" | "dashboard" | "bot" | "worker";
    };
}
