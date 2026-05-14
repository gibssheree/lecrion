interface Product {
    id: number;
    name: string;
    price?: number;
    stock?: number;
    description?: string;
    category?: string;
}
interface IngredientItem {
    name: string;
    stock: number;
    unit?: string;
    status?: string;
    minimumStock?: number;
    category?: string;
}
export declare function inferIngredients(product: Product): string[];
export declare function formatIngredientReply(product: Product | null): string;
export declare function formatAllIngredientsReply(products: Product[], categoryFilter?: string | null): string;
export declare function formatIngredientInventorySummaryReply(summary: any[]): string;
export declare function formatAllIngredientStocksReply(items: IngredientItem[], globalStats?: any): string;
export declare function formatIngredientCategoryReply(category: string, items: IngredientItem[]): string;
export declare function formatSingleIngredientStockReply(item: IngredientItem | null): string;
export declare function formatLowStockIngredientsReply(items: IngredientItem[]): string;
export declare function formatOutOfStockSummaryReply(globalStats: any, items: IngredientItem[]): string;
export declare function formatPopIceAvailabilityReply(items: any[]): string;
export {};
