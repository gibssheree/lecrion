import { TenantsService } from './tenants.service';
import { AuthUser } from '../auth/auth.types';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    listTenants(): {
        tenantId: string;
        name: string;
        status: string;
    }[];
    getTenantContext(user: AuthUser): {
        tenantId: string;
        storeId: string;
        channel: string;
    };
}
