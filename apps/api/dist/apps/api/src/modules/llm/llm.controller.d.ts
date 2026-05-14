import { LlmService } from './llm.service';
import { LlmRole } from './llm.types';
interface LlmChatBody {
    message: string;
    role?: LlmRole;
    sender?: string;
}
export declare class LlmController {
    private readonly llmService;
    constructor(llmService: LlmService);
    chat(body: LlmChatBody): Promise<{
        reply: string;
    }>;
    getTools(): {
        tools: ({
            name: string;
            description: string;
            readOnly: boolean;
            parameters: {
                name: {
                    type: string;
                    description: string;
                    required: boolean;
                };
                orderId?: undefined;
                limit?: undefined;
                phone?: undefined;
            };
        } | {
            name: string;
            description: string;
            readOnly: boolean;
            parameters: {
                orderId: {
                    type: string;
                    description: string;
                    required: boolean;
                };
                name?: undefined;
                limit?: undefined;
                phone?: undefined;
            };
        } | {
            name: string;
            description: string;
            readOnly: boolean;
            parameters: {
                limit: {
                    type: string;
                    description: string;
                    required: boolean;
                };
                name?: undefined;
                orderId?: undefined;
                phone?: undefined;
            };
        } | {
            name: string;
            description: string;
            readOnly: boolean;
            parameters: {
                name?: undefined;
                orderId?: undefined;
                limit?: undefined;
                phone?: undefined;
            };
        } | {
            name: string;
            description: string;
            readOnly: boolean;
            parameters: {
                phone: {
                    type: string;
                    description: string;
                    required: boolean;
                };
                name?: undefined;
                orderId?: undefined;
                limit?: undefined;
            };
        })[];
    };
}
export {};
