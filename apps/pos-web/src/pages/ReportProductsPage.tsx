// apps/pos-web/src/pages/ReportProductsPage.tsx
//
// Phase 12 — Laporan Produk / Laporan Menu.
// Backed by GET /api/reports/pos/top-products with date range filtering.
// Used for both retail (Laporan Produk) and F&B (Laporan Menu).

import { useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  Download,
  Package,
  RefreshCw,
  TrendingUp,
  Trophy,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getPosTopProducts } from "../services/api";
import { fmt } from "../utils/fmt";

interface Props {
  /** "menu" for F&B (uses term "menu"), "products" for retail */
  flavor?: "menu" | "products";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
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

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportProductsPage({ flavor = "products" }: Props) {
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(todayStr());

  const isMenu = flavor === "menu";
  const heading = isMenu ? "Laporan Menu" : "Laporan Produk";
  const itemLabel = isMenu ? "Menu" : "Produk";

  const top = useApi(
    () => getPosTopProducts({ fromDate: from, toDate: to, limit: 50 }),
    [from, to],
  );

  const rows = top.data ?? [];

  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + (r.qty || 0), 0);
    const totalRev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const items = rows.length;
    const top1 = rows[0];
    return { totalQty, totalRev, items, top1 };
  }, [rows]);

  function applyPreset(p: { from: string; to: string }) {
    setFrom(p.from);
    setTo(p.to);
  }

  function exportCsv() {
    if (!rows.length) return;
    const header = ["Peringkat", itemLabel, "Qty Terjual", "Pendapatan"];
    const data = rows.map((r, i) => [i + 1, r.name, r.qty, r.revenue]);
    downloadCsv(`laporan-${flavor}-${from}-${to}.csv`, [header, ...data]);
  }

  return (
    <PosAppShell title={heading}>
      {/* Date filter */}
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Calendar size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Rentang Tanggal</strong>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginLeft: 12,
            }}
          >
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`chip${
                  from === p.from && to === p.to ? " chip--active" : ""
                }`}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <input
              type="date"
              className="form-input form-input-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span style={{ color: "var(--text-muted)" }}>—</span>
            <input
              type="date"
              className="form-input form-input-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => top.reload()}
              title="Muat ulang"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportCsv}
              disabled={!rows.length}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <Package size={13} /> Total {itemLabel}
          </div>
          <div className="summary-card-value">{totals.items}</div>
          <div className="summary-card-sub">aktif terjual</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <TrendingUp size={13} color="var(--info)" /> Qty Terjual
          </div>
          <div className="summary-card-value" style={{ color: "var(--info)" }}>
            {fmt(totals.totalQty)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <BarChart2 size={13} color="var(--stock-ok)" /> Pendapatan
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            Rp{fmt(totals.totalRev)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Trophy size={13} color="var(--stock-low)" /> Terlaris
          </div>
          <div
            className="summary-card-value"
            style={{
              color: "var(--stock-low)",
              fontSize: 16,
              lineHeight: 1.3,
            }}
          >
            {totals.top1?.name ?? "—"}
          </div>
          {totals.top1 && (
            <div className="summary-card-sub">
              {fmt(totals.top1.qty)} terjual · Rp{fmt(totals.top1.revenue)}
            </div>
          )}
        </div>
      </div>

      {/* Top items table */}
      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Trophy size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>
            Peringkat {itemLabel} Terlaris
          </strong>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginLeft: 8,
            }}
          >
            {from} → {to}
          </span>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {top.loading && rows.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : rows.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Belum ada penjualan pada periode ini.
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: "center" }}>#</th>
                  <th>{itemLabel}</th>
                  <th style={{ textAlign: "right" }}>Qty Terjual</th>
                  <th style={{ textAlign: "right" }}>Pendapatan</th>
                  <th style={{ textAlign: "right" }}>Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const share =
                    totals.totalRev === 0
                      ? 0
                      : (row.revenue / totals.totalRev) * 100;
                  return (
                    <tr key={row.productId ?? row.product_id ?? index}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {index + 1}
                      </td>
                      <td>{row.name}</td>
                      <td style={{ textAlign: "right" }}>{fmt(row.qty)}</td>
                      <td style={{ textAlign: "right" }}>
                        Rp{fmt(row.revenue)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 80,
                              height: 6,
                              background: "var(--bg-elevated)",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, share)}%`,
                                height: "100%",
                                background: "var(--primary)",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              minWidth: 38,
                              textAlign: "right",
                            }}
                          >
                            {share.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
