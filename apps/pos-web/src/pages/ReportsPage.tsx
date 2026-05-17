// apps/pos-web/src/pages/ReportsPage.tsx
//
// Phase 10: Owner Analytics — upgraded to use POS-specific endpoints.
// Shows: POS summary, daily breakdown, hourly chart, top products,
// payment mix, cashier performance, promo performance.

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
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { getReportSnapshots } from "../services/api";

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

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
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
    <div
      style={{
        background: "var(--bg-elevated, #f9fafb)",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? "inherit" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Hourly Bar Chart ──────────────────────────────────────────────────────────

function HourlyChart({ data }: { data: any[] }) {
  if (!data.length)
    return (
      <div style={{ color: "#9ca3af", fontSize: 13 }}>
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
              background:
                h.saleCount > 0 ? "var(--color-primary, #2563eb)" : "#e5e7eb",
              borderRadius: "3px 3px 0 0",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: 9, color: "#9ca3af" }}>{h.hour}</span>
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
  const [tab, setTab] = useState<"overview" | "daily" | "cashier" | "promo">(
    "overview",
  );

  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [hourly, setHourly] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMix, setPaymentMix] = useState<any[]>([]);
  const [cashierPerf, setCashierPerf] = useState<any[]>([]);
  const [promoPerf, setPromoPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const [s, d, h, tp, pm, cp, pp] = await Promise.all([
        api<any>(`/api/reports/pos/summary${qs}`),
        api<any[]>(`/api/reports/pos/daily?limit=30`),
        api<any[]>(`/api/reports/pos/hourly`),
        api<any[]>(`/api/reports/pos/top-products${qs}&limit=10`),
        api<any[]>(`/api/reports/pos/payment-mix${qs}`),
        api<any[]>(`/api/reports/pos/cashier-performance${qs}`),
        api<any[]>(`/api/reports/pos/promo-performance${qs}`),
      ]);
      setSummary(s);
      setDaily(Array.isArray(d) ? d : []);
      setHourly(Array.isArray(h) ? h : []);
      setTopProducts(Array.isArray(tp) ? tp : []);
      setPaymentMix(Array.isArray(pm) ? pm : []);
      setCashierPerf(Array.isArray(cp) ? cp : []);
      setPromoPerf(Array.isArray(pp) ? pp : []);
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

  const TABS = [
    { key: "overview", label: "Ringkasan", icon: <BarChart2 size={13} /> },
    { key: "daily", label: "Harian", icon: <TrendingUp size={13} /> },
    { key: "cashier", label: "Kasir", icon: <Users size={13} /> },
    { key: "promo", label: "Promo", icon: <Tag size={13} /> },
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
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "1px solid var(--border, #e5e7eb)",
                background:
                  preset === i ? "var(--color-primary, #2563eb)" : "none",
                color: preset === i ? "#fff" : "inherit",
                cursor: "pointer",
                fontSize: 12,
              }}
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
            style={{
              padding: "5px 8px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPreset(-1);
            }}
            style={{
              padding: "5px 8px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </div>
        <button
          onClick={load}
          style={{
            padding: "5px 10px",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 6,
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
          }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            background: "#fee2e2",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: "#dc2626",
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          borderBottom: "1px solid var(--border, #e5e7eb)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 13,
              borderBottom:
                tab === t.key
                  ? "2px solid var(--color-primary, #2563eb)"
                  : "2px solid transparent",
              color:
                tab === t.key ? "var(--color-primary, #2563eb)" : "#6b7280",
              fontWeight: tab === t.key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 32, color: "#9ca3af" }}>
          Memuat data…
        </div>
      )}

      {!loading && tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary cards */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              <SummaryCard
                label="Gross Sales"
                value={`Rp${fmt(summary.grossSales)}`}
                color="var(--color-primary, #2563eb)"
              />
              <SummaryCard
                label="Net Sales"
                value={`Rp${fmt(summary.netSales)}`}
                color="#16a34a"
              />
              <SummaryCard
                label="Diskon"
                value={`Rp${fmt(summary.discountTotal)}`}
                color="#d97706"
              />
              <SummaryCard label="Pajak" value={`Rp${fmt(summary.taxTotal)}`} />
              <SummaryCard
                label="Refund"
                value={`Rp${fmt(summary.refundTotal)}`}
                sub={`${summary.refundCount} transaksi`}
                color="#dc2626"
              />
              <SummaryCard
                label="Void"
                value={`${summary.voidCount}`}
                sub="transaksi"
                color="#dc2626"
              />
              <SummaryCard
                label="Transaksi"
                value={`${summary.saleCount}`}
                color="var(--color-primary, #2563eb)"
              />
              <SummaryCard
                label="Net Revenue"
                value={`Rp${fmt(summary.netRevenue)}`}
                color="#16a34a"
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
                      {p.saleCount} · Rp{fmt(p.totalAmount)} (
                      {fmtPct(p.percentage)})
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
                    <span style={{ color: "#dc2626", marginLeft: 6 }}>
                      ↩ Rp{fmt(d.refundTotal)}
                    </span>
                  )}
                  {d.voidCount > 0 && (
                    <span style={{ color: "#d97706", marginLeft: 6 }}>
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
                  borderBottom: "1px solid var(--border, #e5e7eb)",
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
                    style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}
                  >
                    Rp{fmt(c.grossSales)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  <span>{c.saleCount} transaksi</span>
                  <span>Avg Rp{fmt(c.avgSaleValue)}</span>
                  <span>Diskon Rp{fmt(c.discountTotal)}</span>
                  {c.voidCount > 0 && (
                    <span style={{ color: "#dc2626" }}>
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
                        color: "#7c3aed",
                        marginLeft: 6,
                        fontFamily: "monospace",
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
    </PosAppShell>
  );
}
