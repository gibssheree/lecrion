export declare function formatMenuList(products: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
    category?: string;
}>): string;
export declare function formatFavoritesList(items?: Array<{
    id: number;
    name: string;
    price: number;
    stock: number;
}>): string;
export declare function formatProductDetail(product: {
    id: number;
    name: string;
    price: number;
    stock: number;
    description?: string;
} | null): string;
export declare function formatDeliveryRequestInstruction(): string;
export declare function formatHelpQuick(): string;
