import { LlmRole, LlmContext } from './llm.types';
export declare class PromptTemplatesService {
    readonly ROLES: LlmRole[];
    buildSystemPrompt(role?: LlmRole, context?: LlmContext): string;
}
