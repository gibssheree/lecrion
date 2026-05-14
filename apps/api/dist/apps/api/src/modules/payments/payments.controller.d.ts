import { PaymentsService, RecordPaymentDto, ConfirmPaymentDto } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
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
    listPayments(storeId?: string, limit?: string): Promise<{
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
    getPaymentById(id: number): Promise<{
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
}
