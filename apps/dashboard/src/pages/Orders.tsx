import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getOrders, updateOrderStatus } from "../services/api";
import { Package } from "lucide-react";
import {
  StatusBadge,
  StatCard,
  StatGrid,
  FilterBar,
  DataTable,
} from "../components/ui";

// Canonical order status values — must match libs/contracts/src/enums/index.ts
const ORDER_STATUSES = [
  "pending",
  "pending_payment",
  "paid",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Dibayar" },
  { value: "confirmed", label: "Dikonfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);
  const orders = useApi(() => getOrders(statusFilter, 100), [statusFilter], {
    autoRefreshMs: 15_000,
  });

  async function handleStatusUpdate(id: number, newStatus: string) {
    setUpdating(id);
    try {
      await updateOrderStatus(id, newStatus);
      orders.reload();
    } catch (err: unknown) {
      alert(
        "Gagal update status: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setUpdating(null);
    }
  }

  const rows = (orders.data?.orders ?? []) as any[];
  const completedCount = rows.filter((o) => o.status === "completed").length;
  const pendingCount = rows.filter((o) => o.status === "pending").length;

  return (
    <>
      <FilterBar onRefresh={orders.reload}>
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`btn btn-sm ${statusFilter === opt.value ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </FilterBar>

      {statusFilter === "all" && (
        <StatGrid columns={3}>
          <StatCard color="blue" label="Total Pesanan" value={rows.length} />
          <StatCard color="green" label="Selesai" value={completedCount} />
          <StatCard color="yellow" label="Pending" value={pendingCount} />
        </StatGrid>
      )}

      <div className="card">
        <div
          className="card-title"
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Package size={14} /> Pesanan
        </div>
        <DataTable
          loading={orders.loading}
          rows={rows}
          rowKey={(o) => o.id}
          emptyMessage="Tidak ada pesanan"
          columns={[
            {
              key: "id",
              header: "#",
              render: (o) => (
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                  #{o.id}
                </span>
              ),
            },
            { key: "name", header: "Nama", render: (o) => o.name },
            { key: "type", header: "Tipe", render: (o) => o.type },
            {
              key: "payment",
              header: "Pembayaran",
              render: (o) => o.payment_method,
            },
            {
              key: "status",
              header: "Status",
              render: (o) => <StatusBadge status={o.status} />,
            },
            {
              key: "time",
              header: "Waktu",
              render: (o) => (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(o.created_at).toLocaleString("id-ID")}
                </span>
              ),
            },
            {
              key: "action",
              header: "Aksi",
              render: (o) => (
                <select
                  className="form-select"
                  style={{ padding: "4px 8px", fontSize: 12, minWidth: 130 }}
                  value={o.status}
                  disabled={updating === o.id}
                  onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
