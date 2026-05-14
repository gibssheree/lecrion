import { RegisterService } from './register.service';
import { OpenSessionDto, CloseSessionDto } from '../cashflow/cashflow.service';
import { AuthUser } from '../auth/auth.types';
export declare class RegisterController {
    private readonly registerService;
    constructor(registerService: RegisterService);
    openSession(dto: OpenSessionDto): Promise<{
        sessionId: number;
    }>;
    closeSession(dto: CloseSessionDto): Promise<{
        sessionId: number;
        countedCash: number;
        expected: number;
        variance: number;
    }>;
    suspendSession(id: number, user: AuthUser): Promise<{
        sessionId: number;
        status: "suspended";
    }>;
    resumeSession(id: number, user: AuthUser): Promise<{
        sessionId: number;
        status: "open";
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
    getSessionById(id: number): Promise<{
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
    getSessionBalance(id: number): Promise<{
        sessionId: number;
        balance: number;
    }>;
}
