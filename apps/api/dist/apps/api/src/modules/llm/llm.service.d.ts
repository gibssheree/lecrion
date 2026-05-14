import { LlmAdapterService } from './llm-adapter.service';
import { PromptTemplatesService } from './prompt-templates.service';
import { LlmToolsService } from './llm-tools.service';
import { AuditService } from '../audit/audit.service';
import { LlmChatOptions } from './llm.types';
export declare class LlmService {
    private readonly adapter;
    private readonly promptTemplates;
    private readonly tools;
    private readonly audit;
    private readonly logger;
    constructor(adapter: LlmAdapterService, promptTemplates: PromptTemplatesService, tools: LlmToolsService, audit: AuditService);
    chat(opts: LlmChatOptions): Promise<string>;
    private parseToolCalls;
    private applyGuardrails;
    buildStoreContext(opts: {
        catalogContext?: string;
        cartContext?: string;
        waIdentity?: {
            role?: string;
            waNumber?: string;
        };
    }): string;
}
