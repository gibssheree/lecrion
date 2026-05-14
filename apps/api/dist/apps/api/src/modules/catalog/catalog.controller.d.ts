import { CatalogService } from './catalog.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
export declare class CatalogController {
    private readonly catalogService;
    private readonly audit;
    private readonly realtime;
    constructor(catalogService: CatalogService, audit: AuditService, realtime: RealtimeService);
    getProducts(q: string): Promise<{
        products: {
            id: number;
            name: string;
            price: number;
            displayPrice: number;
            stock: number;
            description: string;
            imageUrl: string | null;
            category: string;
            available: boolean;
        }[];
    }>;
    getProductById(idParam: string): Promise<{
        product: {
            id: number;
            name: string;
            price: number;
            displayPrice: number;
            stock: number;
            description: string;
            imageUrl: string | null;
            category: string;
            available: boolean;
        };
    }>;
    updateStock(idParam: string, stockParam: number): Promise<{
        status: string;
        id: number;
        stock: number;
    }>;
}
