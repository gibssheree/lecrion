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
  /** Which store this conversation belongs to (SEC-11) — used to give the
   * system prompt that store's name instead of a generic one. Optional so
   * existing callers that don't have a resolved store yet still compile;
   * PromptTemplatesService falls back to a generic prompt without it. */
  storeId?: string;
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
