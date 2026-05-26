// apps/pos-web/src/pages/ReportsPage.tsx
//
// Phase 10: Owner Analytics — upgraded to use POS-specific endpoints.
// Phase 11: Forecasting sub-tab added (6-month revenue/profit projection).

import { useState, useEffect, useCallback } from "react";
import {
  BarChart2,
  TrendingUp,
  Package,
  RefreshCw,
  Clock,
  Users,
  Tag,
  CreditCard,
  AlertCircle,
  TrendingDown,
  Minus,
  Download,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { fmt, fmtPct } from "../utils/fmt";

const BASE = "";
function getToken() {
  const s = sessionStorage.getItem("pos_token");
  if (s) return s;
  try {
    const p = JSON.parse(localStorage.getItem("pos-auth") ?? "{}");
    return p?.state?.token ?? null;
  } catch {
    return null;
  }
}
async function api<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

// ── CSV export helper ─────────────────────────────────────────────────────────

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv, ""], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Date range helpers ────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Hari Ini", from: todayStr(), to: todayStr() },
  { label: "7 Hari", from: daysAgo(6), to: todayStr() },
  { label: "30 Hari", from: daysAgo(29), to: todayStr() },
  {
    label: "Bulan Ini",
    from: new Date().toISOString().slice(0, 8) + "01",
    to: todayStr(),
  },
];

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div
        className="summary-card-value"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && <div className="summary-card-sub">{sub}</div>}
    </div>
  );
}

// ── Hourly Bar Chart ──────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: any[] }) {
  if (!data.length)
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
        Belum ada data hari ini
      </div>
    );
  const max = Math.max(...data.map((h) => h.grossSales), 1);
  const businessHours = data.filter((h) => h.hour >= 7 && h.hour <= 22);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 80,
        overflowX: "auto",
      }}
    >
      {businessHours.map((h) => (
        <div
          key={h.hour}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 28,
          }}
        >
          <div
            title={`${h.hourLabel}: ${h.saleCount} transaksi · Rp${fmt(h.grossSales)}`}
            style={{
              width: 20,
              height: Math.max(4, Math.round((h.grossSales / max) * 70)),
              background: h.saleCount > 0 ? "var(--primary)" : "var(--border)",
              borderRadius: "3px 3px 0 0",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
            {h.hour}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [preset, setPreset] = useState(0);
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [tab, setTab] = useState<"overview" | "daily" | "cashier" | "promo" | "forecast">(
    "overview",
  );

  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMix, setPaymentMix] = useState<any[]>([]);
  const [cashierPerf, setCashierPerf] = useState<any[]>([]);
  const [promoPerf, setPromoPerf] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const [s, d, h, tp, pm, cp, pp, fc] = await Promise.all([
        api<any>(`/api/reports/pos/summary${qs}`),
        api<any[]>(`/api/reports/pos/daily?limit=30`),
        api<any[]>(`/api/reports/pos/hourly`),
        api<any[]>(`/api/reports/pos/top-products${qs}&limit=10`),
        api<any[]>(`/api/reports/pos/payment-mix${qs}`),
        api<any[]>(`/api/reports/pos/cashier-performance${qs}`),
        api<any[]>(`/api/reports/pos/promo-performance${qs}`),
        api<any>(`/api/reports/pos/forecast`),
      ]);
      setSummary(s);
      setDaily(Array.isArray(d) ? d : []);
      setHourly(Array.isArray(h) ? h : []);
      setTopProducts(Array.isArray(tp) ? tp : []);
      setPaymentMix(Array.isArray(pm) ? pm : []);
      setCashierPerf(Array.isArray(cp) ? cp : []);
      setPromoPerf(Array.isArray(pp) ? pp : []);
      setForecast(fc ?? null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  function applyPreset(idx: number) {
    setPreset(idx);
    setDateFrom(PRESETS[idx].from);
    setDateTo(PRESETS[idx].to);
  }

  function handleExportCsv() {
    const range = `${dateFrom}_${dateTo}`;
    if (tab === "daily") {
      downloadCsv(`laporan-harian-${range}.csv`, [
        ["Tanggal", "Transaksi", "Gross Sales (Rp)", "Refund (Rp)", "Void"],
        ...daily.map((d: any) => [d.salesDate, d.saleCount, d.grossSales, d.refundTotal ?? 0, d.voidCount ?? 0]),
      ]);
    } else if (tab === "cashier") {
      downloadCsv(`performa-kasir-${range}.csv`, [
        ["Kasir", "Transaksi", "Gross Sales (Rp)", "Avg Nilai (Rp)", "Diskon (Rp)", "Void"],
        ...cashierPerf.map((c: any) => [c.cashierId, c.saleCount, c.grossSales, c.avgSaleValue, c.discountTotal, c.voidCount ?? 0]),
      ]);
    } else if (tab === "promo") {
      downloadCsv(`performa-promo-${range}.csv`, [
        ["Nama Promo", "Kode Voucher", "Penggunaan", "Total Diskon (Rp)"],
        ...promoPerf.map((p: any) => [p.promoName, p.voucherCode ?? "", p.usageCount, p.totalDiscount]),
      ]);
    } else if (tab === "overview") {
      const rows: (string | number)[][] = [
        ["Metrik", "Nilai (Rp)"],
        ["Gross Sales", summary?.grossSales ?? 0],
        ["Net Sales", summary?.netSales ?? 0],
        ["Diskon", summary?.discountTotal ?? 0],
        ["Pajak", summary?.taxTotal ?? 0],
        ["Refund", summary?.refundTotal ?? 0],
        ["Void", summary?.voidCount ?? 0],
        ["Transaksi", summary?.saleCount ?? 0],
        ["Net Revenue", summary?.netRevenue ?? 0],
      ];
      downloadCsv(`ringkasan-${range}.csv`, rows);
    } else if (tab === "forecast") {
      downloadCsv(`forecast-${range}.csv`, [
        ["Bulan", "Tipe", "Revenue (Rp)", "COGS (Rp)", "Biaya (Rp)", "Net Profit (Rp)"],
        ...(forecast?.historical ?? []).map((m: any) => [m.month, "Historis", m.revenue, m.cogs, m.expenses, m.netProfit]),
        ...(forecast?.forecast ?? []).map((m: any) => [m.month, "Proyeksi", m.revenue, m.cogs, m.expenses, m.netProfit]),
      ]);
    }
  }

  const TABS = [
    { key: "overview", label: "Ringkasan", icon: <BarChart2 size={13} /> },
    { key: "daily", label: "Harian", icon: <TrendingUp size={13} /> },
    { key: "cashier", label: "Kasir", icon: <Users size={13} /> },
    { key: "promo", label: "Promo", icon: <Tag size={13} /> },
    { key: "forecast", label: "Forecasting", icon: <TrendingUp size={13} /> },
  ] as const;

  return (
    <PosAppShell title="Laporan & Analitik">
      {/* Date range controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`chip ${preset === i ? "chip--active" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPreset(-1);
            }}
            className="form-input"
            style={{ width: "auto", padding: "5px 8px" }}
          />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPreset(-1);
            }}
            className="form-input"
            style={{ width: "auto", padding: "5px 8px" }}
          />
        </div>
        <button
          onClick={load}
          className="btn btn-ghost btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button
          onClick={handleExportCsv}
          className="btn btn-ghost btn-sm"
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="cash-tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cash-tab ${tab === t.key ? "active" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-center">
          <div className="spinner" />
          <span>Memuat data…</span>
        </div>
      )}

      {!loading && tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary cards */}
          {summary && (
            <div
              className="summary-grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
            >
              <SummaryCard
                label="Gross Sales"
                value={`Rp${fmt(summary.grossSales)}`}
                color="var(--primary)"
              />
              <SummaryCard
                label="Net Sales"
                value={`Rp${fmt(summary.netSales)}`}
                color="var(--success)"
              />
              <SummaryCard
                label="Diskon"
                value={`Rp${fmt(summary.discountTotal)}`}
                color="var(--warning)"
              />
              <SummaryCard label="Pajak" value={`Rp${fmt(summary.taxTotal)}`} />
              <SummaryCard
                label="Refund"
                value={`Rp${fmt(summary.refundTotal)}`}
                sub={`${summary.refundCount} transaksi`}
                color="var(--danger)"
              />
              <SummaryCard
                label="Void"
                value={`${summary.voidCount}`}
                sub="transaksi"
                color="var(--danger)"
              />
              <SummaryCard
                label="Transaksi"
                value={`${summary.saleCount}`}
                color="var(--primary)"
              />
              <SummaryCard
                label="Net Revenue"
                value={`Rp${fmt(summary.netRevenue)}`}
                color="var(--success)"
              />
            </div>
          )}

          {/* Hourly chart */}
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={14} /> Penjualan Per Jam (Hari Ini)
              </span>
            </div>
            <div className="dashboard-card-body">
              <HourlyChart data={hourly} />
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            {/* Top products */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Package size={14} /> Produk Terlaris
                </span>
              </div>
              <div className="dashboard-card-body">
                {topProducts.slice(0, 8).map((p: any, i: number) => (
                  <div key={i} className="shift-row">
                    <span className="shift-row-label">
                      {i + 1}. {p.name}
                    </span>
                    <span className="shift-row-value">
                      {p.unitsSold} unit · Rp{fmt(p.revenue)}
                    </span>
                  </div>
                ))}
                {!topProducts.length && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Belum ada data
                  </div>
                )}
              </div>
            </div>

            {/* Payment mix */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CreditCard size={14} /> Metode Pembayaran
                </span>
              </div>
              <div className="dashboard-card-body">
                {paymentMix.map((p: any, i: number) => (
                  <div key={i} className="shift-row">
                    <span className="shift-row-label">{p.method}</span>
                    <span className="shift-row-value">
                      {p.saleCount} · Rp{fmt(p.totalAmount)} ({fmtPct(p.percentage)})
                    </span>
                  </div>
                ))}
                {!paymentMix.length && (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Belum ada data
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "daily" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} /> Revenue Harian (30 Hari Terakhir)
            </span>
          </div>
          <div className="dashboard-card-body">
            {daily.slice(0, 30).map((d: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">{d.salesDate}</span>
                <span className="shift-row-value">
                  {d.saleCount} transaksi · Rp{fmt(d.grossSales)}
                  {d.refundTotal > 0 && (
                    <span style={{ color: "var(--danger)", marginLeft: 6 }}>
                      ↩ Rp{fmt(d.refundTotal)}
                    </span>
                  )}
                  {d.voidCount > 0 && (
                    <span style={{ color: "var(--warning)", marginLeft: 6 }}>
                      ✗ {d.voidCount}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {!daily.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Belum ada data
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "cashier" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> Performa Kasir
            </span>
          </div>
          <div className="dashboard-card-body">
            {cashierPerf.map((c: any, i: number) => (
              <div
                key={i}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {c.cashierId}
                  </span>
                  <span
                    style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}
                  >
                    Rp{fmt(c.grossSales)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>{c.saleCount} transaksi</span>
                  <span>Avg Rp{fmt(c.avgSaleValue)}</span>
                  <span>Diskon Rp{fmt(c.discountTotal)}</span>
                  {c.voidCount > 0 && (
                    <span style={{ color: "var(--danger)" }}>
                      Void: {c.voidCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!cashierPerf.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Belum ada data kasir
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "promo" && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Tag size={14} /> Performa Promosi & Voucher
            </span>
          </div>
          <div className="dashboard-card-body">
            {promoPerf.map((p: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">
                  {p.promoName}
                  {p.voucherCode && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--primary)",
                        marginLeft: 6,
                        fontFamily: "monospace",
                        background: "var(--primary-light)",
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      {p.voucherCode}
                    </span>
                  )}
                </span>
                <span className="shift-row-value">
                  {p.usageCount}× · Diskon Rp{fmt(p.totalDiscount)}
                </span>
              </div>
            ))}
            {!promoPerf.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Belum ada promosi digunakan
              </div>
            )}
          </div>
        </div>
      )}
      {!loading && tab === "forecast" && (
        <ForecastTab data={forecast} />
      )}
    </PosAppShell>
  );
}

// ── Forecasting Tab ───────────────────────────────────────────────────────────

function ForecastTab({ data }: { data: any }) {
  if (!data) {
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 24, textAlign: "center" }}>
        Belum ada data historis untuk forecasting.
      </div>
    );
  }

  const { historical = [], forecast = [], trend = {} } = data;
  const allMonths = [...historical, ...forecast];
  const maxRevenue = Math.max(...allMonths.map((m: any) => m.revenue), 1);

  const trendIcon = (t: string) =>
    t === "up" ? <TrendingUp size={13} style={{ color: "var(--success)" }} /> :
    t === "down" ? <TrendingDown size={13} style={{ color: "var(--danger)" }} /> :
    <Minus size={13} style={{ color: "var(--text-muted)" }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Trend summary cards */}
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div className="summary-card">
          <div className="summary-card-label">Tren Pendapatan</div>
          <div className="summary-card-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {trendIcon(trend.revenueTrend)}
            <span style={{ color: trend.revenueTrend === "up" ? "var(--success)" : "var(--danger)", fontSize: 14 }}>
              {trend.revenueTrend === "up" ? "Naik" : trend.revenueTrend === "down" ? "Turun" : "Stabil"}
            </span>
          </div>
          <div className="summary-card-sub">
            {trend.revenueGrowthPerMonth > 0 ? "+" : ""}{trend.revenueGrowthPerMonth?.toFixed(1)}% / bulan
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Tren Profit</div>
          <div className="summary-card-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {trendIcon(trend.profitTrend)}
            <span style={{ color: trend.profitTrend === "up" ? "var(--success)" : "var(--danger)", fontSize: 14 }}>
              {trend.profitTrend === "up" ? "Naik" : trend.profitTrend === "down" ? "Turun" : "Stabil"}
            </span>
          </div>
          <div className="summary-card-sub">berdasarkan 6 bln lalu</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Margin Profit Rata-rata</div>
          <div className="summary-card-value" style={{ color: (trend.profitMarginAvgPct ?? 0) >= 0 ? "var(--success)" : "var(--danger)" }}>
            {trend.profitMarginAvgPct?.toFixed(1)}%
          </div>
          <div className="summary-card-sub">net profit / revenue</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Tren Pengeluaran</div>
          <div className="summary-card-value" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {trendIcon(trend.expenseTrend)}
            <span style={{ color: trend.expenseTrend === "up" ? "var(--danger)" : "var(--success)", fontSize: 14 }}>
              {trend.expenseTrend === "up" ? "Naik" : trend.expenseTrend === "down" ? "Turun" : "Stabil"}
            </span>
          </div>
          <div className="summary-card-sub">pengeluaran operasional</div>
        </div>
      </div>

      {/* Bar chart: historical + forecast */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={14} /> Revenue 6 Bulan Lalu + Proyeksi 6 Bulan Ke Depan
          </span>
          <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--primary)", display: "inline-block" }} /> Historis
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--warning)", display: "inline-block" }} /> Proyeksi
            </span>
          </div>
        </div>
        <div className="dashboard-card-body">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, overflowX: "auto", paddingBottom: 4 }}>
            {historical.map((m: any) => (
              <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 48 }}>
                <div style={{
                  width: 36,
                  height: Math.max(4, Math.round((m.revenue / maxRevenue) * 100)),
                  background: "var(--primary)",
                  borderRadius: "3px 3px 0 0",
                  cursor: "default",
                }} title={`${m.month}\nRevenue: Rp${fmt(m.revenue)}\nProfit: Rp${fmt(m.netProfit)}`} />
                <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{m.month.slice(5)}</span>
              </div>
            ))}
            <div style={{ width: 1, background: "var(--border)", height: 110, alignSelf: "flex-end", marginBottom: 16 }} />
            {forecast.map((m: any) => (
              <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 48 }}>
                <div style={{
                  width: 36,
                  height: Math.max(4, Math.round((m.revenue / maxRevenue) * 100)),
                  background: "var(--warning)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.85,
                  cursor: "default",
                }} title={`${m.month} (Proyeksi)\nRevenue: Rp${fmt(m.revenue)}\nProfit: Rp${fmt(m.netProfit)}`} />
                <span style={{ fontSize: 9, color: "var(--warning)", textAlign: "center", fontWeight: 600 }}>{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart2 size={14} /> Data Historis (6 Bulan Lalu)
            </span>
          </div>
          <div className="dashboard-card-body">
            {historical.map((m: any) => (
              <div key={m.month} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.month}</span>
                  <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>
                    Rp{fmt(m.revenue)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-secondary)" }}>
                  <span>COGS: Rp{fmt(m.cogs)}</span>
                  <span>Biaya: Rp{fmt(m.expenses)}</span>
                  <span style={{ color: m.netProfit >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                    Profit: Rp{fmt(m.netProfit)}
                  </span>
                </div>
              </div>
            ))}
            {!historical.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Belum ada data historis</div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} /> Proyeksi 6 Bulan Ke Depan
            </span>
          </div>
          <div className="dashboard-card-body">
            {forecast.map((m: any) => (
              <div key={m.month} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{m.month}</span>
                  <span style={{ fontSize: 13, color: "var(--warning)", fontWeight: 600 }}>
                    Rp{fmt(m.revenue)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-secondary)" }}>
                  <span>COGS: Rp{fmt(m.cogs)}</span>
                  <span>Biaya: Rp{fmt(m.expenses)}</span>
                  <span style={{ color: m.netProfit >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                    Profit: Rp{fmt(m.netProfit)}
                  </span>
                </div>
              </div>
            ))}
            {!forecast.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Belum ada proyeksi</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>
        * Proyeksi menggunakan linear regression berdasarkan data 6 bulan terakhir. Angka ini adalah estimasi, bukan jaminan.
      </div>
    </div>
  );
}
