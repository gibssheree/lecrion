import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Package, ChevronDown, ChevronUp, ExternalLink, PackageSearch } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { getOrders, getOrderById, updateOrderStatus } from "../services/api";
import { useToast } from "../store/toast.store";
import { fmt } from "../utils/fmt";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/ui/Pagination";
import Select from "../components/ui/Select";

const STATUSES = ["all", "Not Ready", "confirmed", "completed", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

const STATUS_LABEL: Record<string, string> = {
  all: "Semua",
  "Not Ready": "Baru",
  confirmed: "Dikonfirmasi",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  pending_payment: "Menunggu Bayar",
};

const STATUS_COLOR: Record<string, string> = {
  "Not Ready": "var(--warning)",
  completed: "var(--success)",
  cancelled: "var(--danger)",
  confirmed: "var(--primary)",
  pending_payment: "var(--primary)",
};

const STATUS_BG: Record<string, string> = {
  "Not Ready": "var(--stock-low-bg)",
  completed: "var(--stock-ok-bg)",
  cancelled: "var(--stock-out-bg)",
  confirmed: "var(--primary-light)",
  pending_payment: "var(--primary-light)",
};

const TYPE_LABEL: Record<string, string> = {
  pickup: "Ambil Sendiri",
  dine_in: "Makan di Tempat",
  delivery: "Pengiriman",
};


export default function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<OrderStatus>("all");
  const [updating, setUpdating] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);
  // Optimistic status overrides: applied immediately, rolled back on error
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, string>>({});
  const toast = useToast();

  const orders = useApi(() => getOrders(filter, 100), [filter], {
    autoRefreshMs: 15_000,
  });
  const allRows = (orders.data?.orders ?? []) as any[];
  const pagination = usePagination(allRows, 20);
  const rows = pagination.slice;

  async function handleStatus(id: number, status: string) {
    // #19 Optimistic update — apply immediately, rollback on error
    const originalStatus = (orders.data?.orders ?? []).find((o: any) => o.id === id)?.status as string | undefined;
    setOptimisticStatuses((prev) => ({ ...prev, [id]: status }));
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      orders.reload();
      // Clear optimistic override after reload confirms it
      setOptimisticStatuses((prev) => { const next = { ...prev }; delete next[id]; return next; });
      toast.success(`Status diperbarui ke "${STATUS_LABEL[status] ?? status}"`);
    } catch (e: any) {
      // Rollback to original status
      setOptimisticStatuses((prev) => {
        const next = { ...prev };
        if (originalStatus !== undefined) next[id] = originalStatus;
        else delete next[id];
        return next;
      });
      toast.error(e.message ?? "Gagal memperbarui status");
    } finally {
      setUpdating(null);
    }
  }

  async function toggleDetail(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (detailCache[id]) return;
    setLoadingDetail(id);
    try {
      const detail = await getOrderById(id);
      setDetailCache((prev) => ({ ...prev, [id]: detail }));
    } catch {
      // detail not available, row still expands with basic info
    } finally {
      setLoadingDetail(null);
    }
  }

  return (
    <PosAppShell title="Pesanan">
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`chip ${filter === s ? "chip--active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {STATUS_LABEL[s] ?? s}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}
          onClick={orders.reload}
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        {orders.loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : !rows.length ? (
          <EmptyState
            icon={<PackageSearch size={44} />}
            title="Tidak ada pesanan"
            description={
              filter !== "all"
                ? `Tidak ada pesanan dengan status "${STATUS_LABEL[filter] ?? filter}".`
                : "Belum ada transaksi yang tercatat. Mulai transaksi dari layar Kasir."
            }
            compact
          />
        ) : (
          <table className="pos-data-table">
            <thead>
              <tr>
                {["#", "Nama", "Tipe", "Total", "Pembayaran", "Status", "Waktu", "Aksi"].map(
                  (h) => <th key={h}>{h}</th>,
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((o: any) => {
                // #19 use optimistic status if present, fallback to server value
                const displayStatus = optimisticStatuses[o.id] ?? o.status;
                const isOptimistic = optimisticStatuses[o.id] !== undefined;
                return (
                <>
                  <tr
                    key={o.id}
                    style={{ cursor: "pointer", opacity: isOptimistic ? 0.8 : 1 }}
                    onClick={() => toggleDetail(o.id)}
                  >
                    <td style={{ color: "var(--primary)", fontWeight: 700 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {expandedId === o.id
                          ? <ChevronUp size={12} />
                          : <ChevronDown size={12} />}
                        #{o.id}
                        {/* #8 Detail link */}
                        <button
                          title="Buka halaman detail"
                          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`); }}
                          style={{
                            background: "none", border: "none", padding: "1px 3px",
                            cursor: "pointer", color: "var(--text-muted)", display: "inline-flex",
                          }}
                        >
                          <ExternalLink size={10} />
                        </button>
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{o.name || "—"}</div>
                      {o.channel && o.channel !== "in_store" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <span
                            className="badge blue"
                            style={{
                              fontSize: 10,
                              padding: "1px 6px",
                              fontWeight: 700,
                              textTransform: "capitalize",
                              borderRadius: 4,
                            }}
                          >
                            {o.channel} {o.external_order_id ? `#${o.external_order_id}` : ""}
                          </span>
                          {o.courier_name && (
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                              ({o.courier_name})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {TYPE_LABEL[o.type] ?? o.type ?? "—"}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {o.total != null ? `Rp${fmt(o.total)}` : "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{o.payment_method ?? "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <span
                        style={{
                          padding: "3px 9px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          background: STATUS_BG[displayStatus] ?? "var(--bg-elevated)",
                          color: STATUS_COLOR[displayStatus] ?? "var(--text-muted)",
                          transition: "background 0.2s, color 0.2s",
                        }}
                      >
                        {STATUS_LABEL[displayStatus] ?? displayStatus}
                        {isOptimistic && " ⋯"}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(o.created_at).toLocaleString("id-ID", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Select
                        style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                        value={displayStatus}
                        disabled={updating === o.id}
                        onChange={(e) => handleStatus(o.id, e.target.value)}
                      >
                        {["Not Ready", "confirmed", "completed", "cancelled"].map(
                          (s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>,
                        )}
                      </Select>
                    </td>
                  </tr>

                  {/* Expandable detail row */}
                  {expandedId === o.id && (
                    <tr key={`${o.id}-detail`}>
                      <td colSpan={8} style={{ padding: 0, background: "var(--bg-elevated)" }}>
                        {loadingDetail === o.id ? (
                          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
                            <div className="spinner" style={{ width: 14, height: 14 }} /> Memuat detail...
                          </div>
                        ) : detailCache[o.id] ? (
                          <div style={{ padding: "12px 20px" }}>
                            {/* Items table */}
                            {(detailCache[o.id]?.items ?? detailCache[o.id]?.sale_items ?? []).length > 0 ? (
                              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                                    <th style={{ textAlign: "left", padding: "4px 8px 6px 0", fontWeight: 600 }}>Produk</th>
                                    <th style={{ textAlign: "center", padding: "4px 8px 6px", fontWeight: 600 }}>Qty</th>
                                    <th style={{ textAlign: "right", padding: "4px 0 6px 8px", fontWeight: 600 }}>Harga</th>
                                    <th style={{ textAlign: "right", padding: "4px 0 6px 8px", fontWeight: 600 }}>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(detailCache[o.id]?.items ?? detailCache[o.id]?.sale_items ?? []).map((item: any, idx: number) => (
                                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                      <td style={{ padding: "5px 8px 5px 0" }}>{item.name ?? item.product_name ?? `#${item.product_id}`}</td>
                                      <td style={{ textAlign: "center", padding: "5px 8px" }}>{item.qty ?? item.quantity}</td>
                                      <td style={{ textAlign: "right", padding: "5px 8px 5px 0" }}>Rp{fmt(item.price ?? item.unit_price)}</td>
                                      <td style={{ textAlign: "right", padding: "5px 0", fontWeight: 600 }}>Rp{fmt((item.qty ?? item.quantity) * (item.price ?? item.unit_price))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tidak ada detail item.</div>
                            )}

                            {/* Totals summary */}
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 8, fontSize: 12 }}>
                              {detailCache[o.id]?.discount_amount > 0 && (
                                <span style={{ color: "var(--warning)" }}>Diskon: -Rp{fmt(detailCache[o.id].discount_amount)}</span>
                              )}
                              {detailCache[o.id]?.tax_amount > 0 && (
                                <span>Pajak: +Rp{fmt(detailCache[o.id].tax_amount)}</span>
                              )}
                              <span style={{ fontWeight: 700, fontSize: 13 }}>
                                Total: Rp{fmt(detailCache[o.id]?.total ?? o.total)}
                              </span>
                            </div>

                            {/* Notes */}
                            {(detailCache[o.id]?.note || detailCache[o.id]?.customer_name) && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 16 }}>
                                {detailCache[o.id]?.customer_name && <span>Pelanggan: <strong>{detailCache[o.id].customer_name}</strong></span>}
                                {detailCache[o.id]?.note && <span>Catatan: {detailCache[o.id].note}</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: "10px 20px", fontSize: 12, color: "var(--text-muted)" }}>
                            Detail tidak tersedia.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ); })}
            </tbody>
          </table>
        )}
        <Pagination {...pagination} />
      </div>
    </PosAppShell>
  );
}
