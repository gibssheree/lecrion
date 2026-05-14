export declare function getMonthName(monthNumber: number): string;
export declare function formatReportReply(title: string, payload: {
    totalOrders?: number;
    totalItems?: number;
    totalRevenue?: number;
}): string;
export declare function formatYearDetailReport(year: number, yearSales: {
    totalOrders?: number;
    totalItems?: number;
    totalRevenue?: number;
}, monthlyBreakdown: Array<{
    monthNumber: number;
    totalOrders: number;
    totalItems: number;
    totalRevenue: number;
}>, topProducts: Array<{
    name: string;
    totalQty: number;
    totalRevenue: number;
}>): string;
export declare function formatMonthReportReply(year: number, month: number, monthSales: {
    totalOrders?: number;
    totalItems?: number;
    totalRevenue?: number;
}, topProducts: Array<{
    name: string;
    totalQty: number;
    totalRevenue: number;
}>): string;
export declare function formatBestMonthReply(year: number, monthlyBreakdown: Array<{
    monthNumber: number;
    totalOrders: number;
    totalItems: number;
    totalRevenue: number;
}>): string;
