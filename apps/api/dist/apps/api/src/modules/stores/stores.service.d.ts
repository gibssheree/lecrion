import { PrismaService } from '@libs/db/src/prisma';
export declare class StoresService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private dbKey;
    getSettings(storeId?: string): Promise<Record<string, string>>;
    getSetting(key: string, defaultValue?: string, storeId?: string): Promise<string>;
    setSetting(key: string, value: string, storeId?: string): Promise<void>;
    setSettings(settings: Record<string, string>, storeId?: string): Promise<void>;
    deleteSetting(key: string, storeId?: string): Promise<void>;
    getStoreInfo(storeId?: string): {
        storeId: string;
        name: string;
        tenantId: string;
        status: string;
    };
}
