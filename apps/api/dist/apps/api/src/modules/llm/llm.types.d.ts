export interface LlmHistoryTurn {
    role: 'user' | 'model';
    content: string;
}
export interface LlmChatOptions {
    sender: string;
    message: string;
    role?: LlmRole;
    history?: LlmHistoryTurn[];
    context?: LlmContext;
    correlationId?: string;
}
export interface LlmContext {
    catalogContext?: string;
    cartContext?: string;
    posContext?: string;
    roleContext?: string;
    systemPrompt?: string;
}
export type LlmRole = 'customer' | 'admin' | 'cashier' | 'support';
export interface ToolCallResult {
    ok: boolean;
    result?: any;
    error?: string;
}
