import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
export type ProjectionName = 'daily_revenue' | 'monthly_revenue' | 'top_products' | 'payment_mix' | 'stock_alerts' | 'open_orders' | 'bot_conversation_counts';
export interface ProjectionResult {
    data: any;
    builtAt: string;
}
export declare class ReadModelService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    rebuild(projectionName?: ProjectionName): Promise<void>;
    rebuildAll(): Promise<void>;
    get(projectionName: ProjectionName): Promise<ProjectionResult | null>;
    getAll(): Promise<Record<string, ProjectionResult>>;
    private buildProjection;
}
