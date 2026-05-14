import { PrismaService } from '@libs/db/src/prisma';
export interface CartItem {
    productId: number;
    name: string;
    qty: number;
    price: number;
}
export interface Cart {
    sender: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    updatedAt: string;
}
export declare class CartService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCart(sender: string): Promise<Cart>;
    private calculateTotals;
    saveCart(sender: string, items: CartItem[]): Promise<void>;
    addItemToCart(sender: string, productId: number, qty?: number): Promise<Cart>;
    removeItemFromCart(sender: string, productRef: string | number): Promise<{
        removed: boolean;
        cart: Cart;
    }>;
    clearCart(sender: string): Promise<Cart>;
    formatCartForMessage(cart: Cart): string;
}
