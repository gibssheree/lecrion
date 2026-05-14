import { PrismaService } from '@libs/db/src/prisma';
export interface ChatHistoryEntry {
    id: number;
    sender: string;
    name?: string | null;
    question: string;
    reply: string;
    type: string;
    cart_items?: string | null;
    total_price?: number | null;
    order_id?: number | null;
    created_at: string;
}
export interface LlmHistoryTurn {
    role: 'user' | 'model';
    content: string;
}
export declare class HistoryService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    addEntry(data: {
        sender: string;
        name?: string;
        question: string;
        reply: string;
        type?: string;
        cartItems?: string;
        totalPrice?: number;
        orderId?: number;
    }): Promise<void>;
    getEntries(limit?: number): Promise<ChatHistoryEntry[]>;
    getHistoryBySender(sender: string, limit?: number): Promise<LlmHistoryTurn[]>;
    getRawHistoryBySender(sender: string, limit?: number): Promise<ChatHistoryEntry[]>;
    clearHistory(sender?: string): Promise<void>;
    getConversationCounts(days?: number): Promise<Array<{
        date: string;
        uniqueSenders: number;
        messageCount: number;
    }>>;
}
