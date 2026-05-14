export type UserRole = "owner" | "manager" | "cashier" | "inventory_staff" | "support" | "bot_service" | "worker_service" | "llm_service";
export declare const OrderStatus: {
    readonly PENDING: "pending";
    readonly PENDING_PAYMENT: "pending_payment";
    readonly PAID: "paid";
    readonly CONFIRMED: "confirmed";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
    readonly REFUNDED: "refunded";
};
export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const ORDER_STATUS_VALUES: OrderStatusValue[];
export declare const RegisterSessionStatus: {
    readonly OPEN: "open";
    readonly SUSPENDED: "suspended";
    readonly CLOSED: "closed";
};
export type RegisterSessionStatusValue = (typeof RegisterSessionStatus)[keyof typeof RegisterSessionStatus];
export declare const REGISTER_SESSION_STATUS_VALUES: RegisterSessionStatusValue[];
export declare const CashflowEntryType: {
    readonly INCOME: "income";
    readonly EXPENSE: "expense";
    readonly REFUND: "refund";
};
export type CashflowEntryTypeValue = (typeof CashflowEntryType)[keyof typeof CashflowEntryType];
export declare const StockMovementType: {
    readonly SALE: "sale";
    readonly RESTOCK: "restock";
    readonly ADJUSTMENT: "adjustment";
    readonly WASTE: "waste";
    readonly RETURN: "return";
};
export type StockMovementTypeValue = (typeof StockMovementType)[keyof typeof StockMovementType];
export declare const PaymentMethod: {
    readonly CASH: "Cash";
    readonly TRANSFER: "Transfer";
    readonly QRIS: "QRIS";
    readonly GOPAY: "GoPay";
};
export type PaymentMethodValue = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export declare const PaymentStatus: {
    readonly PENDING: "pending";
    readonly PAID: "paid";
    readonly FAILED: "failed";
    readonly REFUNDED: "refunded";
};
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];
