import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
export interface RecordPaymentDto {
    orderId: number;
    amount: number;
    paidAmount?: number;
    discount?: number;
    tax?: number;
    paymentMethod?: string;
    storeId?: string;
    operatorId?: string;
}
export interface ConfirmPaymentDto {
    paymentId: number;
    paidAmount: number;
    operatorId?: string;
}
export declare class PaymentsService {
    private readonly prisma;
    private readonly audit;
    private readonly sync;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService, sync: SyncService);
    recordPayment(dto: RecordPaymentDto): Promise<{
        paymentId: number;
        orderId: number;
        status: "pending";
    }>;
    confirmPayment(dto: ConfirmPaymentDto): Promise<{
        paymentId: number;
        orderId: number;
        status: "paid";
        paidAmount: number;
    }>;
    getPaymentsByOrder(orderId: number): Promise<{
        status: string;
        created_at: string;
        id: number;
        store_id: string;
        order_id: number;
        payment_method: string;
        amount: number;
        discount: number;
        tax: number;
        paid_amount: number;
        completed_at: string | null;
    }[]>;
    getPaymentById(paymentId: number): Promise<{
        status: string;
        created_at: string;
        id: number;
        store_id: string;
        order_id: number;
        payment_method: string;
        amount: number;
        discount: number;
        tax: number;
        paid_amount: number;
        completed_at: string | null;
    }>;
    listPayments(storeId?: string, limit?: number): Promise<{
        status: string;
        created_at: string;
        id: number;
        store_id: string;
        order_id: number;
        payment_method: string;
        amount: number;
        discount: number;
        tax: number;
        paid_amount: number;
        completed_at: string | null;
    }[]>;
}
