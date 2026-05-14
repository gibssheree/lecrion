import { BarChart2, TrendingUp, Package, RefreshCw } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getReportSnapshots } from "../services/api";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function ReportsPage() {
  const snapshots = useApi(getReportSnapshots, [], { autoRefreshMs: 60_000 });
  const daily = (snapshots.data?.snapshots?.daily_revenue?.data ?? []) as any[];
  const monthly = (snapshots.data?.snapshots?.monthly_revenue?.data ??
    []) as any[];
  const topProd = (snapshots.data?.snapshots?.top_products?.data ??
    []) as any[];
  const payMix = (snapshots.data?.snapshots?.payment_mix?.data ?? []) as any[];

  return (
    <PosAppShell title="Laporan">
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={snapshots.reload}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Daily revenue */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} /> Revenue Harian (30 Hari)
            </span>
          </div>
          <div className="dashboard-card-body">
            {daily.slice(0, 10).map((d: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">{d.date}</span>
                <span className="shift-row-value">
                  Rp{fmt(d.revenue)} ({d.order_count} order)
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

        {/* Top products */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Package size={14} /> Produk Terlaris (30 Hari)
            </span>
          </div>
          <div className="dashboard-card-body">
            {topProd.map((p: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">
                  {i + 1}. {p.name}
                </span>
                <span className="shift-row-value">
                  {p.units_sold} unit · Rp{fmt(p.revenue)}
                </span>
              </div>
            ))}
            {!topProd.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Belum ada data
              </div>
            )}
          </div>
        </div>

        {/* Monthly revenue */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart2 size={14} /> Revenue Bulanan
            </span>
          </div>
          <div className="dashboard-card-body">
            {monthly.map((m: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">{m.month}</span>
                <span className="shift-row-value">
                  Rp{fmt(m.revenue)} ({m.order_count} order)
                </span>
              </div>
            ))}
            {!monthly.length && (
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
              <BarChart2 size={14} /> Metode Pembayaran
            </span>
          </div>
          <div className="dashboard-card-body">
            {payMix.map((p: any, i: number) => (
              <div key={i} className="shift-row">
                <span className="shift-row-label">
                  {p.payment_method || "-"}
                </span>
                <span className="shift-row-value">
                  {p.order_count} order · Rp{fmt(p.revenue)}
                </span>
              </div>
            ))}
            {!payMix.length && (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Belum ada data
              </div>
            )}
          </div>
        </div>
      </div>
    </PosAppShell>
  );
}
