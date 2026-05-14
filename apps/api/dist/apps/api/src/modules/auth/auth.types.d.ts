export type UserRole = 'owner' | 'manager' | 'cashier' | 'inventory_staff' | 'support' | 'bot_service' | 'worker_service' | 'llm_service';
export interface JwtPayload {
    sub: string;
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
export declare class LoginDto {
    email: string;
    password: string;
    storeId?: string;
}
export declare class RefreshDto {
    refreshToken: string;
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
