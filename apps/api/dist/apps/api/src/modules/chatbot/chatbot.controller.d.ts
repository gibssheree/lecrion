import { HistoryService } from './history.service';
export declare class ChatbotController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    getHistory(limit?: string): Promise<{
        history: import("./history.service").ChatHistoryEntry[];
    }>;
    clearHistory(sender: string): Promise<{
        ok: boolean;
        sender: string;
    }>;
}
