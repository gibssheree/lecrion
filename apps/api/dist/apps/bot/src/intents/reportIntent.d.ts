export interface ReportIntent {
    type: "report_today" | "report_year" | "report_year_detail" | "report_month" | "report_best_month" | "report_summary";
    year?: number;
    month?: number;
}
export declare function extractMonthNumber(text: string): number | null;
export declare function detectReportIntent(normalized: string): ReportIntent | null;
