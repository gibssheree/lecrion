import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { LlmHistoryTurn, LlmContext } from './llm.types';
export declare class LlmAdapterService {
    private readonly config;
    private readonly logger;
    constructor(config: AppConfigService);
    createSafeReply(message: string, history?: LlmHistoryTurn[], context?: LlmContext): Promise<string>;
    private createGeminiReply;
    private applyGuardrails;
}
