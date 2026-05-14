import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
export declare class ReportsController {
    private readonly reportsService;
    private readonly readModel;
    constructor(reportsService: ReportsService, readModel: ReadModelService);
    getSalesSummary(): Promise<{
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
        averageOrderValue: number;
    }>;
    getSalesDaily(limit?: string): Promise<{
        salesDate: any;
        totalSales: number;
        totalItems: number;
        totalRevenue: number;
    }[]>;
    getSalesByPayment(): Promise<{
        paymentMethod: any;
        totalSales: number;
        totalItems: number;
        totalRevenue: number;
    }[]>;
    getSalesByType(): Promise<{
        orderType: any;
        totalSales: number;
        totalItems: number;
        totalRevenue: number;
    }[]>;
    getSalesTopProducts(year?: string, month?: string, limit?: string): Promise<{
        menuId: number;
        name: any;
        totalQty: number;
        totalRevenue: number;
    }[]>;
    getStockChangeLogs(limit?: string): Promise<{
        id: number;
        menuId: number;
        menuName: any;
        adminId: number | null;
        orderId: number | null;
        changeType: any;
        qtyBefore: number;
        qtyChange: number;
        qtyAfter: number;
        note: any;
        createdAt: any;
    }[]>;
    getYearBundle(year: string): Promise<{
        yearSales: {
            totalOrders: number;
            totalItems: number;
            totalRevenue: number;
        };
        monthlyBreakdown: {
            monthNumber: number;
            totalOrders: number;
            totalItems: number;
            totalRevenue: number;
        }[];
        topProducts: {
            menuId: number;
            name: any;
            totalQty: number;
            totalRevenue: number;
        }[];
    }>;
    getMonthBundle(year: string, month: string): Promise<{
        monthSales: {
            totalOrders: number;
            totalItems: number;
            totalRevenue: number;
        };
        topProducts: {
            menuId: number;
            name: any;
            totalQty: number;
            totalRevenue: number;
        }[];
    }>;
    getAllProjections(): Promise<Record<string, import("./read-model.service").ProjectionResult>>;
    getProjection(name: string): Promise<import("./read-model.service").ProjectionResult | null>;
    rebuildProjection(name: string): Promise<{
        ok: boolean;
        projection: string;
    }>;
    rebuildAll(): Promise<{
        ok: boolean;
    }>;
}
