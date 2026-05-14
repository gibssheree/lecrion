import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { CashflowEntryTypeValue } from '@libs/contracts/src/enums';
export type { CashflowEntryTypeValue as CashflowEntryType };
export interface OpenSessionDto {
    storeId?: string;
    cashierId: string;
    openingCash?: number;
    notes?: string;
}
export interface CloseSessionDto {
    sessionId: number;
    countedCash: number;
    notes?: string;
    operatorId: string;
}
export interface RecordEntryDto {
    entryType: CashflowEntryTypeValue;
    amount: number;
    operatorId: string;
    storeId?: string;
    sessionId?: number;
    referenceType?: string;
    referenceId?: string;
    category?: string;
    note?: string;
    paymentMethod?: string;
}
export declare class CashflowService {
    private readonly prisma;
    private readonly audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
    openSession(dto: OpenSessionDto): Promise<{
        sessionId: number;
    }>;
    closeSession(dto: CloseSessionDto): Promise<{
        sessionId: number;
        countedCash: number;
        expected: number;
        variance: number;
    }>;
    recordEntry(dto: RecordEntryDto): Promise<{
        entryId: number;
        sessionId: number;
    }>;
    getSessionBalance(sessionId: number): Promise<number>;
    getActiveSession(storeId?: string): Promise<{
        status: string;
        id: number;
        store_id: string;
        notes: string | null;
        cashier_id: string;
        opening_cash: number;
        expected_cash: number;
        counted_cash: number | null;
        variance: number | null;
        opened_at: string;
        closed_at: string | null;
    } | null>;
    listEntries(sessionId: number, limit?: number): Promise<{
        created_at: string;
        id: number;
        store_id: string;
        payment_method: string;
        note: string | null;
        amount: number;
        category: string | null;
        session_id: number;
        entry_type: string;
        reference_type: string | null;
        reference_id: string | null;
        operator_id: string;
    }[]>;
    listSessions(storeId?: string, limit?: number): Promise<{
        status: string;
        id: number;
        store_id: string;
        notes: string | null;
        cashier_id: string;
        opening_cash: number;
        expected_cash: number;
        counted_cash: number | null;
        variance: number | null;
        opened_at: string;
        closed_at: string | null;
    }[]>;
}
