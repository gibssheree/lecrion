// apps/bot/src/formatters/reportFormatter.ts
import { MONTH_NAMES_ID } from "../intents/constants";

function formatRupiah(v: number): string {
  return new Intl.NumberFormat("id-ID").format(Number(v) || 0);
}

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES_ID[Number(monthNumber) - 1] ?? `Bulan ${monthNumber}`;
}

export function formatReportReply(
  title: string,
  payload: { totalOrders?: number; totalItems?: number; totalRevenue?: number },
): string {
  return [
    `📊 ${title}`,
    `- Total order sukses: ${Number(payload?.totalOrders ?? 0)}`,
    `- Total item terjual: ${Number(payload?.totalItems ?? 0)}`,
    `- Total penghasilan: Rp${formatRupiah(Number(payload?.totalRevenue ?? 0))}`,
  ].join("\n");
}

export function formatYearDetailReport(
  year: number,
  yearSales: {
    totalOrders?: number;
    totalItems?: number;
    totalRevenue?: number;
  },
  monthlyBreakdown: Array<{
    monthNumber: number;
    totalOrders: number;
    totalItems: number;
    totalRevenue: number;
  }>,
  topProducts: Array<{ name: string; totalQty: number; totalRevenue: number }>,
): string {
  const totalOrders = Number(yearSales?.totalOrders ?? 0);
  const totalRevenue = Number(yearSales?.totalRevenue ?? 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const bestMonth = [...monthlyBreakdown].sort(
    (a, b) => b.totalOrders - a.totalOrders || b.totalRevenue - a.totalRevenue,
  )[0];
  const insightLine = bestMonth
    ? `Bulan paling ramai: ${getMonthName(bestMonth.monthNumber)} (${bestMonth.totalOrders} order, Rp${formatRupiah(bestMonth.totalRevenue)})`
    : "Bulan paling ramai: belum ada data.";

  return [
    `📊 Laporan POS tahun ${year}`,
    "Ringkasan",
    `- Total order sukses: ${totalOrders}`,
    `- Total item terjual: ${Number(yearSales?.totalItems ?? 0)}`,
    `- Total penghasilan: Rp${formatRupiah(totalRevenue)}`,
    `- Rata-rata per order: Rp${formatRupiah(avgOrderValue)}`,
    "",
    "Performa per bulan",
    ...monthlyBreakdown.map(
      (item) =>
        `- ${getMonthName(item.monthNumber)}: ${item.totalOrders} order | ${item.totalItems} item | Rp${formatRupiah(item.totalRevenue)}`,
    ),
    "",
    "Produk terlaris tahun ini",
    ...topProducts.map(
      (item, i) =>
        `${i + 1}. ${item.name} - ${item.totalQty} item | Rp${formatRupiah(item.totalRevenue)}`,
    ),
    "",
    `Insight: ${insightLine}`,
  ].join("\n");
}

export function formatMonthReportReply(
  year: number,
  month: number,
  monthSales: {
    totalOrders?: number;
    totalItems?: number;
    totalRevenue?: number;
  },
  topProducts: Array<{ name: string; totalQty: number; totalRevenue: number }>,
): string {
  const monthName = getMonthName(month);
  return [
    `📊 Laporan POS ${monthName} ${year}`,
    `- Total order sukses: ${Number(monthSales?.totalOrders ?? 0)}`,
    `- Total item terjual: ${Number(monthSales?.totalItems ?? 0)}`,
    `- Total penghasilan: Rp${formatRupiah(Number(monthSales?.totalRevenue ?? 0))}`,
    "",
    `Produk terlaris ${monthName}`,
    ...topProducts.map(
      (item, i) =>
        `${i + 1}. ${item.name} - ${item.totalQty} item | Rp${formatRupiah(item.totalRevenue)}`,
    ),
  ].join("\n");
}

export function formatBestMonthReply(
  year: number,
  monthlyBreakdown: Array<{
    monthNumber: number;
    totalOrders: number;
    totalItems: number;
    totalRevenue: number;
  }>,
): string {
  if (!monthlyBreakdown.length)
    return `📊 Laporan tahun ${year}\nBelum ada data penjualan pada tahun ini.`;
  const ranked = [...monthlyBreakdown].sort(
    (a, b) => b.totalOrders - a.totalOrders || b.totalRevenue - a.totalRevenue,
  );
  const best = ranked[0];
  return [
    `📈 Bulan teramai tahun ${year}: ${getMonthName(best.monthNumber)}`,
    `- Total order: ${best.totalOrders}`,
    `- Total item: ${best.totalItems}`,
    `- Total penghasilan: Rp${formatRupiah(best.totalRevenue)}`,
    "",
    "Top 3 bulan teratas:",
    ...ranked
      .slice(0, 3)
      .map(
        (item, i) =>
          `${i + 1}. ${getMonthName(item.monthNumber)} - ${item.totalOrders} order | Rp${formatRupiah(item.totalRevenue)}`,
      ),
  ].join("\n");
}
