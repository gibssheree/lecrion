import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  RefreshCw,
  Search,
  Sliders,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import {
  InventoryMovement,
  getInventoryLocations,
  getInventoryMovements,
  getProducts,
} from "../services/api";
import { fmt, fmtDateTime } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";

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
  return: { label: "Return", color: "var(--info)", bg: "var(--primary-light)" },
  transfer_in: {
    label: "Transfer Masuk",
    color: "var(--stock-ok)",
    bg: "var(--stock-ok-bg)",
  },
  transfer_out: {
    label: "Transfer Keluar",
    color: "var(--stock-out)",
    bg: "var(--stock-out-bg)",
  },
};

function metaFor(changeType: string) {
  return (
    CHANGE_TYPE_META[changeType] ?? {
      label: changeType,
      color: "var(--text-secondary)",
      bg: "var(--bg-elevated)",
    }
  );
}

export default function InventoryMovementsPage() {
  const [search, setSearch] = useState("");
  const [changeType, setChangeType] = useState("");
  const [locationId, setLocationId] = useState("");

  const movements = useApi(
    () =>
      getInventoryMovements({
        changeType: changeType || undefined,
        locationId: locationId ? Number(locationId) : undefined,
        limit: 200,
      }),
    [changeType, locationId],
    { autoRefreshMs: 30_000 },
  );
  const products = useApi(getProducts, []);
  const locations = useApi(getInventoryLocations, []);

  const productMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const product of (products.data?.products ?? []) as any[]) {
      map.set(product.id, product.name);
    }
    return map;
  }, [products.data]);

  const allRows = movements.data?.movements ?? [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return allRows;
    const lower = search.trim().toLowerCase();
    return allRows.filter((row: InventoryMovement) => {
      const productName = (productMap.get(row.menuId) ?? "").toLowerCase();
      return (
        productName.includes(lower) ||
        row.note?.toLowerCase().includes(lower) ||
        row.sourceRef?.toLowerCase().includes(lower) ||
        row.operatorId?.toLowerCase().includes(lower)
      );
    });
  }, [allRows, productMap, search]);

  const stats = useMemo(() => {
    const stockIn = filteredRows.reduce(
      (sum, row) => sum + (row.qtyChange > 0 ? row.qtyChange : 0),
      0,
    );
    const stockOut = filteredRows.reduce(
      (sum, row) => sum + (row.qtyChange < 0 ? Math.abs(row.qtyChange) : 0),
      0,
    );
    return {
      total: filteredRows.length,
      stockIn,
      stockOut,
      net: stockIn - stockOut,
    };
  }, [filteredRows]);

  const pagination = usePagination(filteredRows, 25);

  return (
    <PosAppShell title="Mutasi Stok">
      <div
        className="summary-grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}
      >
        <div className="summary-card">
          <div className="summary-card-label">
            <History size={13} /> Mutasi (filter)
          </div>
          <div className="summary-card-value">{stats.total}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ArrowUpCircle size={13} color="var(--stock-ok)" /> Stok Masuk
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-ok)" }}
          >
            +{fmt(stats.stockIn)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ArrowDownCircle size={13} color="var(--stock-out)" /> Stok Keluar
          </div>
          <div
            className="summary-card-value"
            style={{ color: "var(--stock-out)" }}
          >
            −{fmt(stats.stockOut)}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Sliders size={13} /> Net Movement
          </div>
          <div
            className="summary-card-value"
            style={{
              color:
                stats.net > 0
                  ? "var(--stock-ok)"
                  : stats.net < 0
                    ? "var(--stock-out)"
                    : "var(--text-primary)",
            }}
          >
            {stats.net >= 0 ? "+" : "−"}
            {fmt(Math.abs(stats.net))}
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div
          className="dashboard-card-header"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            className="form-input"
            placeholder="Cari produk, catatan, operator…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <select
            className="form-select"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">Semua tipe</option>
            {Object.entries(CHANGE_TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            className="form-select"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ width: 200 }}
          >
            <option value="">Semua lokasi</option>
            {(locations.data ?? []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              movements.reload();
              products.reload();
            }}
            style={{ marginLeft: "auto" }}
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {movements.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Produk</th>
                  <th>Tipe</th>
                  <th style={{ textAlign: "right" }}>Qty Sebelum</th>
                  <th style={{ textAlign: "right" }}>Perubahan</th>
                  <th style={{ textAlign: "right" }}>Qty Sesudah</th>
                  <th>Operator</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {pagination.slice.map((row: InventoryMovement) => {
                  const meta = metaFor(row.changeType);
                  return (
                    <tr key={row.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {fmtDateTime(row.createdAt)}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {productMap.get(row.menuId) ?? `#${row.menuId}`}
                      </td>
                      <td>
                        <span
                          className="stock-badge"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {fmt(row.qtyBefore)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            row.qtyChange >= 0
                              ? "var(--stock-ok)"
                              : "var(--stock-out)",
                        }}
                      >
                        {row.qtyChange >= 0 ? "+" : ""}
                        {fmt(row.qtyChange)}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {fmt(row.qtyAfter)}
                      </td>
                      <td
                        style={{ color: "var(--text-secondary)", fontSize: 12 }}
                      >
                        {row.operatorId ?? "—"}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {row.note ?? row.sourceRef ?? "—"}
                      </td>
                    </tr>
                  );
                })}
                {!filteredRows.length && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        padding: 24,
                      }}
                    >
                      Tidak ada mutasi pada filter ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination {...pagination} />
      </div>
    </PosAppShell>
  );
}
