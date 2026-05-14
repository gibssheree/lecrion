import { CheckoutService } from '../checkout/checkout.service';
import { CartService } from '../chatbot/cart.service';
import { ReadModelService } from '../reports/read-model.service';
interface PosCheckoutItem {
    productId: number;
    name: string;
    price: number;
    qty: number;
}
interface PosCheckoutDto {
    items: PosCheckoutItem[];
    paymentMethod: string;
    cashierId: string;
    storeId?: string;
    customerName?: string;
    note?: string;
}
export declare class PosController {
    private readonly checkoutService;
    private readonly cartService;
    private readonly readModelService;
    constructor(checkoutService: CheckoutService, cartService: CartService, readModelService: ReadModelService);
    checkout(dto: PosCheckoutDto): Promise<{
        orderId: any;
        total: any;
        items: any;
        paymentMethod: string;
    }>;
}
export {};
