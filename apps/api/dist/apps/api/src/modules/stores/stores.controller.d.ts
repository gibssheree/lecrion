import { StoresService } from './stores.service';
export declare class StoresController {
    private readonly storesService;
    constructor(storesService: StoresService);
    getStoreInfo(storeId: string): {
        storeId: string;
        name: string;
        tenantId: string;
        status: string;
    };
    getSettings(storeId: string): Promise<Record<string, string>>;
    setSettings(body: Record<string, string>, storeId: string): Promise<{
        ok: boolean;
        storeId: string;
    }>;
    setSetting(key: string, body: {
        value: string;
    }, storeId: string): Promise<{
        ok: boolean;
        key: string;
        storeId: string;
    }>;
    getSetting(key: string, defaultValue: string | undefined, storeId: string): Promise<{
        key: string;
        value: string;
        storeId: string;
    }>;
    deleteSetting(key: string, storeId: string): Promise<{
        ok: boolean;
        key: string;
        storeId: string;
    }>;
}
