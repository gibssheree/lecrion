import { useEffect, useState } from "react";
import {
  X,
  RefreshCw,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getOrders, getOrderById } from "../../services/api";
import OrderStatusBadge from "./OrderStatusBadge";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

interface Props {
  onClose: () => void;
}

export default function RecentOrdersDrawer({ onClose }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, any>>({});
  const [loadingDetail, setLoadingDetail] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await getOrders("all", 50);
      setOrders(res.orders ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!orderDetails[orderId]) {
      setLoadingDetail(orderId);
      try {
        const detail = await getOrderById(orderId);
        setOrderDetails((prev) => ({ ...prev, [orderId]: detail }));
      } catch {
        /* ignore */
      } finally {
        setLoadingDetail(null);
      }
    }
  }

  useEffect(() => {
    load();
    // Auto-refresh every 15s
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  // Group by today vs earlier
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === today,
  );
  const earlierOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() !== today,
  );

  // Daily total
  const dailyTotal = todayOrders.reduce(
    (sum: number, o: any) =>
      o.status !== "cancelled" ? sum + (o.total ?? 0) : sum,
    0,
  );

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 420 }}>
        {/* Header */}
        <div className="drawer-header">
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={16} /> Riwayat Transaksi
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={load}
              style={{ padding: "4px 8px" }}
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ padding: "4px 8px" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Daily summary bar */}
        {todayOrders.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              background: "var(--primary-light)",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
              Hari Ini — {todayOrders.length} transaksi
            </span>
            <span
              style={{
                fontWeight: 800,
                color: "var(--primary-dark)",
                fontSize: 15,
              }}
            >
              Rp{fmt(dailyTotal)}
            </span>
          </div>
        )}

        <div className="drawer-body">
          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : !orders.length ? (
            <div className="loading-center">
              <ClipboardList size={32} color="var(--text-muted)" />
              <span style={{ color: "var(--text-muted)" }}>
                Belum ada transaksi
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {/* Today */}
              {todayOrders.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      padding: "4px 0",
                    }}
                  >
                    Hari Ini
                  </div>
                  {todayOrders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      expanded={expandedId === o.id}
                      detail={orderDetails[o.id]}
                      loadingDetail={loadingDetail === o.id}
                      onToggle={() => toggleExpand(o.id)}
                    />
                  ))}
                </>
              )}

              {/* Earlier */}
              {earlierOrders.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      padding: "8px 0 4px",
                    }}
                  >
                    Sebelumnya
                  </div>
                  {earlierOrders.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      expanded={expandedId === o.id}
                      detail={orderDetails[o.id]}
                      loadingDetail={loadingDetail === o.id}
                      onToggle={() => toggleExpand(o.id)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OrderCard({
  order: o,
  expanded,
  detail,
  loadingDetail,
  onToggle,
}: {
  order: any;
  expanded: boolean;
  detail: any;
  loadingDetail: boolean;
  onToggle: () => void;
}) {
  function fmt(n: number): string {
    return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontWeight: 700,
                color: "var(--primary)",
                fontSize: 14,
              }}
            >
              #{o.id}
            </span>
            <OrderStatusBadge status={o.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              {o.total != null ? `Rp${fmt(o.total)}` : "—"}
            </span>
            {expanded ? (
              <ChevronUp size={14} color="var(--text-muted)" />
            ) : (
              <ChevronDown size={14} color="var(--text-muted)" />
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>
            {o.name || "Pelanggan umum"} · {o.payment_method}
          </span>
          <span>
            {new Date(o.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {loadingDetail ? (
            <div
              style={{
                padding: 16,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div className="spinner" style={{ width: 16, height: 16 }} />
            </div>
          ) : detail?.order_items?.length ? (
            <div>
              {detail.order_items.map((item: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 14px",
                    fontSize: 12,
                    borderBottom:
                      i < detail.order_items.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <span>
                    {item.name}{" "}
                    <span style={{ color: "var(--text-muted)" }}>
                      ×{item.qty}
                    </span>
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    Rp{fmt((item.price ?? 0) * (item.qty ?? 1))}
                  </span>
                </div>
              ))}
              {/* Total row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--primary-dark)" }}>
                  {o.total != null ? `Rp${fmt(o.total)}` : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Detail tidak tersedia
            </div>
          )}
        </div>
      )}
    </div>
  );
}
