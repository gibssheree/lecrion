import { CashflowService, OpenSessionDto, CloseSessionDto } from '../cashflow/cashflow.service';
import { PrismaService } from '@libs/db/src/prisma';
export declare class RegisterService {
    private readonly cashflow;
    private readonly prisma;
    private readonly logger;
    constructor(cashflow: CashflowService, prisma: PrismaService);
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
    getSessionById(sessionId: number): Promise<{
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
    getSessionBalance(sessionId: number): Promise<number>;
    suspendSession(sessionId: number, operatorId: string): Promise<{
        sessionId: number;
        status: "suspended";
    }>;
    resumeSession(sessionId: number, operatorId: string): Promise<{
        sessionId: number;
        status: "open";
    }>;
}
