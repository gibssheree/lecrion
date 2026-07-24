// apps/pos-web/src/pages/ReportInventoryPage.tsx
//
// Phase 12 — Laporan Inventori.
// Combines low-stock alerts + recent stock movements summary.

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Download,
  History,
  Layers,
  Package,
  PackageX,
  RefreshCw,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  getLowStock,
  getOutOfStock,
  getStockChangeLogs,
} from "../services/api";
import { fmt, fmtDateTime } from "../utils/fmt";

const CHANGE_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  sale: {
    label: "Penjualan",
    color: "var(--stock-out)",
    bg: "var(--stock-out-bg)",
  },
  restock: {
    label: "Restock",
    color: "var(--stock-ok)",
    bg: "var(--stock-ok-bg)",
  },
  adjustment: {
    label: "Adjustment",
    color: "var(--stock-low)",
    bg: "var(--stock-low-bg)",
  },
  waste: {
    label: "Waste",
    color: "var(--stock-out)",
    bg: "var(--stock-out-bg)",
  },
  return: {
    label: "Retur",
    color: "var(--info)",
    bg: "var(--primary-light)",
  },
  transfer: {
    label: "Transfer",
    color: "var(--info)",
    bg: "var(--primary-light)",
  },
};

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

export default function ReportInventoryPage() {
  const lowStock = useApi(getLowStock, [], { autoRefreshMs: 60_000 });
  const outOfStock = useApi(getOutOfStock, [], { autoRefreshMs: 60_000 });
  const movements = useApi(() => getStockChangeLogs(200), [], {
    autoRefreshMs: 60_000,
  });

  const lows = lowStock.data ?? [];
  const outs = outOfStock.data ?? [];
  const moves = movements.data ?? [];

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const move of moves) {
      const delta = Number(move.qty_change ?? move.qtyChange ?? 0);
      if (delta > 0) totalIn += delta;
      else totalOut += Math.abs(delta);
    }
    return { totalIn, totalOut, moves: moves.length };
  }, [moves]);

  function exportLowStockCsv() {
    if (!lows.length) return;
    const header = ["Nama Produk", "Stok Saat Ini", "Threshold"];
    const rows = lows.map((p: any) => [
      p.name,
      p.stock,
      p.low_stock_threshold ?? p.threshold ?? "",
    ]);
    downloadCsv("laporan-stok-menipis.csv", [header, ...rows]);
  }

  function exportMovementsCsv() {
    if (!moves.length) return;
    const header = [
      "Waktu",
      "Produk",
      "Tipe",
      "Qty Berubah",
      "Stok Sesudah",
      "Catatan",
    ];
    const rows = moves.map((m: any) => [
      m.created_at ?? m.createdAt,
      m.product_name ?? m.productName ?? m.menu_name ?? `#${m.menu_id}`,
      m.change_type ?? m.changeType ?? "",
      m.qty_change ?? m.qtyChange ?? "",
      m.stock_after ?? m.stockAfter ?? "",
      m.note ?? "",
    ]);
    downloadCsv("laporan-mutasi-stok.csv", [header, ...rows]);
  }

  return (
    <PosAppShell title="Laporan Inventori">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <Layers size={13} /> Mutasi Tercatat
          </div>
          <div className="summary-card-value">{fmt(summary.moves)}</div>
          <div className="summary-card-sub">200 data terbaru</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ArrowUp size={13} color="var(--stock-ok)" /> Stok Masuk
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            +{fmt(summary.totalIn)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ArrowDown size={13} color="var(--stock-out)" /> Stok Keluar
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            −{fmt(summary.totalOut)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <PackageX size={13} color="var(--stock-out)" /> Habis
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            {outs.length}
          </div>
          <div className="summary-card-sub">{lows.length} stok menipis</div>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <AlertTriangle size={14} color="var(--stock-low)" />
          <strong style={{ fontSize: 13 }}>
            Stok Menipis & Habis ({lows.length + outs.length})
          </strong>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                lowStock.reload();
                outOfStock.reload();
              }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportLowStockCsv}
              disabled={lows.length === 0}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {(lowStock.loading || outOfStock.loading) &&
          lows.length === 0 &&
          outs.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : lows.length === 0 && outs.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Tidak ada stok yang perlu diwaspadai.
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th style={{ textAlign: "right" }}>Stok</th>
                  <th style={{ textAlign: "right" }}>Threshold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...outs, ...lows].map((p: any) => {
                  const isOut = (p.stock ?? 0) <= 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.sku && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                            }}
                          >
                            {p.sku}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>{p.stock ?? 0}</td>
                      <td style={{ textAlign: "right" }}>
                        {p.low_stock_threshold ?? p.threshold ?? "—"}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            color: isOut
                              ? "var(--stock-out)"
                              : "var(--stock-low)",
                            background: isOut
                              ? "var(--stock-out-bg)"
                              : "var(--stock-low-bg)",
                          }}
                        >
                          {isOut ? "Habis" : "Menipis"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <History size={14} color="var(--text-muted)" />
          <strong style={{ fontSize: 13 }}>Mutasi Stok Terbaru</strong>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginLeft: 8,
            }}
          >
            {moves.length} entri
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => movements.reload()}
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={exportMovementsCsv}
              disabled={moves.length === 0}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {movements.loading && moves.length === 0 ? (
            <div
              style={{
                padding: 24,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Memuat…
            </div>
          ) : moves.length === 0 ? (
            <div
              style={{
                padding: 28,
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              Belum ada mutasi stok.
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 150 }}>Waktu</th>
                  <th>Produk</th>
                  <th style={{ width: 130 }}>Tipe</th>
                  <th style={{ textAlign: "right", width: 100 }}>
                    Qty Berubah
                  </th>
                  <th style={{ textAlign: "right", width: 100 }}>Sesudah</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {moves.slice(0, 60).map((m: any) => {
                  const type = (
                    m.change_type ??
                    m.changeType ??
                    ""
                  ).toLowerCase();
                  const meta = CHANGE_TYPE_META[type] ?? {
                    label: type || "—",
                    color: "var(--text-secondary)",
                    bg: "var(--bg-elevated)",
                  };
                  const delta = Number(m.qty_change ?? m.qtyChange ?? 0);
                  return (
                    <tr key={m.id}>
                      <td>{fmtDateTime(m.created_at ?? m.createdAt)}</td>
                      <td>
                        {m.product_name ??
                          m.productName ??
                          m.menu_name ??
                          `#${m.menu_id ?? m.menuId}`}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            color: meta.color,
                            background: meta.bg,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color:
                            delta > 0
                              ? "var(--stock-ok)"
                              : delta < 0
                                ? "var(--stock-out)"
                                : "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {m.stock_after ?? m.stockAfter ?? "—"}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        {m.note ?? "—"}
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
