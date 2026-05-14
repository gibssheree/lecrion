export declare class TenantsService {
    private readonly logger;
    validateTenant(tenantId: string): Promise<boolean>;
    validateStore(storeId: string, tenantId: string): Promise<boolean>;
    getDefaultStore(tenantId?: string): string;
    buildCacheKey(tenantId: string, storeId: string, key: string): string;
    buildRealtimeChannel(storeId: string): string;
    listTenants(): {
        tenantId: string;
        name: string;
        status: string;
    }[];
}
