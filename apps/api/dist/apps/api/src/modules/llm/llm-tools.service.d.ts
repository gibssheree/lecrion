import { PrismaService } from '@libs/db/src/prisma';
import { ToolCallResult } from './llm.types';
export declare class LlmToolsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    executeTool(toolName: string, args?: Record<string, any>): Promise<ToolCallResult>;
    private checkProductStock;
    private getOrderStatus;
    private listOpenOrders;
    private getDailySalesSummary;
    private searchCustomerHistory;
}
