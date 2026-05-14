"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMonthNumber = extractMonthNumber;
exports.detectReportIntent = detectReportIntent;
const constants_1 = require("./constants");
function extractMonthNumber(text) {
    const normalized = String(text ?? "").toLowerCase();
    for (const item of constants_1.MONTH_ALIASES) {
        if (item.aliases.some((alias) => new RegExp(`\\b${alias}\\b`, "i").test(normalized))) {
            return item.month;
        }
    }
    const m = normalized.match(/bulan\s*(1[0-2]|0?[1-9])\b/i);
    return m ? Number(m[1]) : null;
}
function detectReportIntent(normalized) {
    const hasReportKeyword = /(penjualan|penghasilan|omzet|laporan|revenue|income|transaksi|pos)/i.test(normalized);
    const asksBestMonth = /(bulan\s+apa|bulan\s+berapa|kebanyakan|paling\s+(ramai|banyak|laris|tinggi|besar)|terbanyak|tertinggi|terlaris)/i.test(normalized);
    const asksDetailed = /(detail|rinci|lengkap|breakdown|per\s*bulan|top\s*produk|produk\s+terlaris|pos\s*style|pos)/i.test(normalized);
    if (!hasReportKeyword && !asksBestMonth && !asksDetailed)
        return null;
    const currentYear = new Date().getFullYear();
    const isCurrentYear = /(tahun\s*ini|this\s*year)/i.test(normalized);
    const yearMatch = normalized.match(/tahun\s*(20\d{2})/i);
    const year = yearMatch
        ? Number(yearMatch[1])
        : isCurrentYear
            ? currentYear
            : null;
    const month = extractMonthNumber(normalized);
    if (/(hari\s*ini|today)/i.test(normalized))
        return { type: "report_today" };
    if (month)
        return { type: "report_month", year: year ?? currentYear, month };
    if (asksBestMonth)
        return { type: "report_best_month", year: year ?? currentYear };
    if (year)
        return { type: asksDetailed ? "report_year_detail" : "report_year", year };
    if (/(total|semua|overall|keseluruhan)/i.test(normalized) || hasReportKeyword)
        return { type: "report_summary" };
    return null;
}
//# sourceMappingURL=reportIntent.js.map