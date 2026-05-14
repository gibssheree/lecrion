import { PrismaService } from '@libs/db/src/prisma';
import { menu as Menu } from '@prisma/client';
export declare class CatalogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    toDisplayRupiah(basePrice: number | null): number;
    formatRupiah(basePrice: number | null): string;
    inferCategory(name?: string, imageUrl?: string | null): string;
    normalizeProduct(row: Menu): {
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
    getAllProducts(): Promise<{
        id: number;
        name: string;
        price: number;
        displayPrice: number;
        stock: number;
        description: string;
        imageUrl: string | null;
        category: string;
        available: boolean;
    }[]>;
    getProductById(id: number): Promise<{
        id: number;
        name: string;
        price: number;
        displayPrice: number;
        stock: number;
        description: string;
        imageUrl: string | null;
        category: string;
        available: boolean;
    } | null>;
    findProductByName(keyword: string): Promise<{
        id: number;
        name: string;
        price: number;
        displayPrice: number;
        stock: number;
        description: string;
        imageUrl: string | null;
        category: string;
        available: boolean;
    } | null>;
    searchProducts(keyword: string, limit?: number): Promise<{
        id: number;
        name: string;
        price: number;
        displayPrice: number;
        stock: number;
        description: string;
        imageUrl: string | null;
        category: string;
        available: boolean;
    }[]>;
    getCatalogContext(limit?: number): Promise<string>;
    getCatalogForStore(): Promise<{
        id: number;
        name: string;
        price: number;
        displayPrice: number;
        stock: number;
        description: string;
        imageUrl: string | null;
        category: string;
        available: boolean;
    }[]>;
    updateStock(id: number, stock: number): Promise<{
        id: number;
        name: string;
        description: string | null;
        stock: number;
        price: number;
        image_url: string | null;
    }>;
}
