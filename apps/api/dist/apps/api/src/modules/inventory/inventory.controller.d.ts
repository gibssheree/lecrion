import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getStats(): Promise<{
        totalItems: number;
        totalStock: number;
    }>;
    getLowStock(threshold: string): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    getOutOfStock(limit: string): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    search(q: string): Promise<{
        id: number;
        name: string;
        stock: number;
    } | null>;
    getPopIce(): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
}
