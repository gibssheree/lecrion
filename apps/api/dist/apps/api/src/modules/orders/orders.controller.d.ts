import { OrdersService } from './orders.service';
import { OrderStatusValue } from '@libs/contracts/src/enums';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    listOrders(status?: string, limit?: string): Promise<{
        total: number;
        order_items: undefined;
        id: number;
        user_id: number;
        type: string;
        name: string;
        phone: string | null;
        address: string | null;
        delivery_cost: number | null;
        payment_method: string | null;
        status: string;
        created_at: string;
        estimated_time: number | null;
    }[]>;
    getOrderById(id: number): Promise<{
        order_items: {
            id: number;
            name: string;
            order_id: number;
            menu_id: number;
            price: number;
            qty: number;
        }[];
    } & {
        id: number;
        user_id: number;
        type: string;
        name: string;
        phone: string | null;
        address: string | null;
        delivery_cost: number | null;
        payment_method: string | null;
        status: string;
        created_at: string;
        estimated_time: number | null;
        cancelled_at: string | null;
        cancellation_reason: string | null;
    }>;
    updateOrderStatus(id: number, body: {
        status: OrderStatusValue;
        operatorId?: string;
    }): Promise<boolean>;
    cancelOrder(id: number, body: {
        reason: string;
        operatorId?: string;
    }): Promise<{
        orderId: number;
        status: "cancelled";
        reason: string;
    }>;
    getOrdersByUser(userId: number, limit?: string): Promise<({
        order_items: {
            id: number;
            name: string;
            order_id: number;
            menu_id: number;
            price: number;
            qty: number;
        }[];
    } & {
        id: number;
        user_id: number;
        type: string;
        name: string;
        phone: string | null;
        address: string | null;
        delivery_cost: number | null;
        payment_method: string | null;
        status: string;
        created_at: string;
        estimated_time: number | null;
        cancelled_at: string | null;
        cancellation_reason: string | null;
    })[]>;
}
