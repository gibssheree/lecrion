import { useState } from "react";
import { RefreshCw, Package } from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getOrders, updateOrderStatus } from "../services/api";

const STATUSES = ["all", "Not Ready", "confirmed", "completed", "cancelled"];

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

const STATUS_COLOR: Record<string, string> = {
  "Not Ready": "#f59e0b",
  completed: "#22c55e",
  cancelled: "#ef4444",
  confirmed: "#3b82f6",
  pending_payment: "#3b82f6",
};

export default function OrdersPage() {
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);
  const orders = useApi(() => getOrders(filter, 50), [filter], {
    autoRefreshMs: 15_000,
  });
  const rows = (orders.data?.orders ?? []) as any[];

  async function handleStatus(id: number, status: string) {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      orders.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <PosAppShell title="Pesanan">
      {/* Filter */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`chip ${filter === s ? "chip--active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Semua" : s}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
          onClick={orders.reload}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {orders.loading ? (
          <div className="loading-center">
            <div className="spinner" />
          </div>
        ) : !rows.length ? (
          <div className="loading-center">
            <Package size={32} color="var(--text-muted)" />
            <span style={{ color: "var(--text-muted)" }}>
              Tidak ada pesanan
            </span>
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                {[
                  "#",
                  "Nama",
                  "Tipe",
                  "Pembayaran",
                  "Status",
                  "Waktu",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o: any) => (
                <tr
                  key={o.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    style={{
                      padding: "11px 14px",
                      color: "var(--primary)",
                      fontWeight: 700,
                    }}
                  >
                    #{o.id}
                  </td>
                  <td style={{ padding: "11px 14px" }}>{o.name}</td>
                  <td
                    style={{ padding: "11px 14px", color: "var(--text-muted)" }}
                  >
                    {o.type}
                  </td>
                  <td
                    style={{ padding: "11px 14px", color: "var(--text-muted)" }}
                  >
                    {o.payment_method}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${STATUS_COLOR[o.status] ?? "#94a3b8"}20`,
                        color: STATUS_COLOR[o.status] ?? "#94a3b8",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "11px 14px",
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {new Date(o.created_at).toLocaleString("id-ID")}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <select
                      style={{
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        background: "var(--bg-surface)",
                        cursor: "pointer",
                      }}
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={(e) => handleStatus(o.id, e.target.value)}
                    >
                      {["Not Ready", "confirmed", "completed", "cancelled"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PosAppShell>
  );
}
