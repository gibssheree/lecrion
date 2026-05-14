import { CashflowService, OpenSessionDto, CloseSessionDto, RecordEntryDto } from './cashflow.service';
export declare class CashflowController {
    private readonly cashflowService;
    constructor(cashflowService: CashflowService);
    openSession(dto: OpenSessionDto): Promise<{
        sessionId: number;
    }>;
    closeSession(dto: CloseSessionDto): Promise<{
        sessionId: number;
        countedCash: number;
        expected: number;
        variance: number;
    }>;
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
    listSessions(storeId?: string, limit?: string): Promise<{
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
    getSessionBalance(id: number): Promise<{
        sessionId: number;
        balance: number;
    }>;
    listEntries(id: number, limit?: string): Promise<{
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
    recordEntry(dto: RecordEntryDto): Promise<{
        entryId: number;
        sessionId: number;
    }>;
}
