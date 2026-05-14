export type ProjectionName = "daily_revenue" | "monthly_revenue" | "top_products" | "payment_mix" | "stock_alerts" | "open_orders" | "bot_conversation_counts";
export declare const ALL_PROJECTION_NAMES: ProjectionName[];
export declare function buildProjection(prisma: any, name: ProjectionName): Promise<any>;
export declare function rebuildProjections(prisma: any, targets?: ProjectionName[], onError?: (name: string, err: Error) => void): Promise<{
    rebuilt: string[];
    failed: string[];
}>;
