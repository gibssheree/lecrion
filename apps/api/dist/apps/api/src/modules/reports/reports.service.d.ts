import { PrismaService } from '@libs/db/src/prisma';
export declare class ReportsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSalesSummary(): Promise<{
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
        averageOrderValue: number;
    }>;
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
    getSalesDaily(limit?: number): Promise<{
        salesDate: any;
        totalSales: number;
        totalItems: number;
        totalRevenue: number;
    }[]>;
    getSalesForDate(dateValue: string): Promise<{
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
    }>;
    getSalesForYear(yearValue: number | string): Promise<{
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
    }>;
    getSalesForMonth(yearValue: number | string, monthValue: number | string): Promise<{
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
    }>;
    getSalesMonthlyBreakdown(yearValue: number | string): Promise<{
        monthNumber: number;
        totalOrders: number;
        totalItems: number;
        totalRevenue: number;
    }[]>;
    getSalesTopProducts(options?: {
        year?: number;
        month?: number;
        limit?: number;
    }): Promise<{
        menuId: number;
        name: any;
        totalQty: number;
        totalRevenue: number;
    }[]>;
    getStockChangeLogs(limit?: number): Promise<{
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
    getYearDetailBundle(year: number): Promise<{
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
    getMonthDetailBundle(year: number, month: number): Promise<{
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
}
