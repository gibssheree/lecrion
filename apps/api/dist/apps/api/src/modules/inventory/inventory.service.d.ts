import { PrismaService } from '@libs/db/src/prisma';
export declare class InventoryService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchIngredientByName(keyword: string): Promise<{
        id: number;
        name: string;
        stock: number;
    } | null>;
    getIngredientGlobalStats(): Promise<{
        totalItems: number;
        totalStock: number;
    }>;
    getIngredientSummaryByCategory(): Promise<{}>;
    getAllIngredientStocks(limit?: number): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    getIngredientsByCategory(category: string, limit?: number): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    getLowStockIngredients(threshold?: number): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    getOutOfStockIngredients(limit?: number): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
    getPopIceAvailability(): Promise<{
        id: number;
        name: string;
        stock: number;
    }[]>;
}
