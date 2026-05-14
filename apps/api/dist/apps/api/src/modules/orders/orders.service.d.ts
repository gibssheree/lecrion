import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { OrderStatusValue } from '@libs/contracts/src/enums';
export { OrderStatusValue };
export declare class OrdersService {
    private readonly prisma;
    private readonly audit;
    private readonly sync;
    private readonly realtime;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, sync: SyncService, realtime: RealtimeService);
    listOrders(statusFilter?: string, limit?: number): Promise<{
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
    updateOrderStatus(id: number, newStatus: OrderStatusValue, operatorId?: string): Promise<boolean>;
    cancelOrder(id: number, reason: string, operatorId?: string): Promise<{
        orderId: number;
        status: "cancelled";
        reason: string;
    }>;
    getOrdersByUser(userId: number, limit?: number): Promise<({
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
