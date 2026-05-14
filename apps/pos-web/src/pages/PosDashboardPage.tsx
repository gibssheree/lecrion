import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  DollarSign,
  LockOpen,
  Lock,
  RefreshCw,
  ShoppingCart,
  Radio,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { useRegisterStore } from "../store/register.store";
import { getReportSnapshots, getOrders } from "../services/api";
import CloseRegisterModal from "../features/register/CloseRegisterModal";
import RegisterGatePage from "../features/register/RegisterGatePage";
import { useSocket } from "../hooks/useSocket";

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function useApi2<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  return useApi(fn, deps, { autoRefreshMs: 30_000 });
}

export default function PosDashboardPage() {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [cashTab, setCashTab] = useState<"today" | "week" | "month">("today");

  const navigate = useNavigate();
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);

  const snapshots = useApi2(getReportSnapshots);
  const orders = useApi2(() => getOrders("all", 20));
  const { events, connected } = useSocket([
    "order.created",
    "order.status_changed",
    "stock.alert",
  ]);

  const daily = snapshots.data?.snapshots?.daily_revenue?.data?.[0];
  const monthly = snapshots.data?.snapshots?.monthly_revenue?.data?.[0];
  const openOrd = (snapshots.data?.snapshots?.open_orders?.data ?? []) as any[];
  const topProd = (snapshots.data?.snapshots?.top_products?.data ??
    []) as any[];
  const recentOrders = (orders.data?.orders ?? []) as any[];

  // If showing open register form
  if (showOpenForm) {
    return (
      <RegisterGatePage
        onSuccess={() => {
          setShowOpenForm(false);
          refresh();
        }}
      />
    );
  }

  return (
    <PosAppShell title="Financial Summary">
      {/* ── Summary cards ─────────────────────────────── */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-label">
            <TrendingUp size={13} color="var(--stock-ok)" /> Total Profit Hari
            Ini
          </div>
          <div className="summary-card-value">Rp{fmt(daily?.revenue)}</div>
          <div className="summary-card-sub">
            {daily?.order_count ?? 0} transaksi
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <ShoppingBag size={13} color="var(--primary)" /> Total Penjualan
            Bulan Ini
          </div>
          <div className="summary-card-value">Rp{fmt(monthly?.revenue)}</div>
          <div className="summary-card-sub">
            {monthly?.order_count ?? 0} pesanan
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <Package size={13} color="var(--stock-low)" /> Pesanan Aktif
          </div>
          <div className="summary-card-value">{openOrd.length}</div>
          <div className="summary-card-sub">belum selesai</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <DollarSign size={13} color="var(--stock-ok)" /> Status Register
          </div>
          <div
            className="summary-card-value"
            style={{
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                display: "inline-block",
                background:
                  status === "open"
                    ? "var(--stock-ok)"
                    : status === "suspended"
                      ? "var(--stock-low)"
                      : "var(--text-muted)",
                boxShadow:
                  status === "open" ? "0 0 8px var(--stock-ok)" : "none",
              }}
            />
            {status === "open"
              ? "AKTIF"
              : status === "suspended"
                ? "SUSPENDED"
                : "TUTUP"}
          </div>
          <div className="summary-card-sub">
            {session ? `Kasir: ${session.cashier_id}` : "Tidak ada sesi"}
          </div>
        </div>
      </div>

      {/* ── Main dashboard grid ───────────────────────── */}
      <div className="dashboard-grid">
        {/* Shift Close */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <DollarSign size={14} /> Shift
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={refresh}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                minHeight: 28,
              }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <div className="dashboard-card-body">
            {/* Register status */}
            <div style={{ marginBottom: 14 }}>
              {status === "none" && (
                <button
                  className="btn btn-success btn-full"
                  onClick={() => setShowOpenForm(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <LockOpen size={15} /> Buka Register
                </button>
              )}
              {status === "open" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={() => navigate("/kasir")}
                  >
                    <ShoppingCart size={14} /> Kasir
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCloseModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Lock size={13} /> Tutup
                  </button>
                </div>
              )}
              {status === "suspended" && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => navigate("/kasir")}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <ShoppingCart size={14} /> Lanjutkan Sesi
                </button>
              )}
            </div>

            {/* Shift summary */}
            <div className="shift-row">
              <span className="shift-row-label">Penjualan Hari Ini</span>
              <span className="shift-row-value">Rp{fmt(daily?.revenue)}</span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Jumlah Transaksi</span>
              <span className="shift-row-value">{daily?.order_count ?? 0}</span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Pesanan Aktif</span>
              <span className="shift-row-value">{openOrd.length}</span>
            </div>
            {session && (
              <div className="shift-row">
                <span className="shift-row-label">Modal Awal</span>
                <span className="shift-row-value">
                  Rp{fmt(session.opening_cash)}
                </span>
              </div>
            )}

            {status === "open" && session && (
              <button
                className="btn btn-danger btn-full btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setShowCloseModal(true)}
              >
                <Lock size={13} /> Tutup Register & Hitung Kas
              </button>
            )}
          </div>
        </div>

        {/* Live Feed */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Radio size={14} /> Live Feed
              {connected && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--stock-ok)",
                    display: "inline-block",
                    boxShadow: "0 0 6px var(--stock-ok)",
                  }}
                />
              )}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {events.length} events
            </span>
          </div>
          <div className="dashboard-card-body">
            {!connected && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                Menghubungkan ke server…
              </div>
            )}
            {events.length === 0 && connected && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                Menunggu event masuk…
              </div>
            )}
            {events.slice(0, 6).map((e, i) => (
              <div key={i} className="feed-item">
                <span className="feed-item-text">
                  {e.eventName === "order.created" &&
                    `Order #${(e.data as any).orderId} dibuat`}
                  {e.eventName === "order.status_changed" &&
                    `Order #${(e.data as any).orderId}: ${(e.data as any).newStatus}`}
                  {e.eventName === "stock.alert" &&
                    `Stok ${(e.data as any).name} menipis`}
                  {![
                    "order.created",
                    "order.status_changed",
                    "stock.alert",
                  ].includes(e.eventName) && e.eventName}
                </span>
                <span className="feed-item-time">
                  {new Date(e.receivedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}

            {/* Recent orders */}
            {recentOrders.slice(0, 4).map((o: any) => (
              <div key={o.id} className="feed-item">
                <span className="feed-item-text">
                  #{o.id} {o.name} — {o.payment_method}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "2px 8px", minHeight: 24, fontSize: 11 }}
                  onClick={() => navigate("/orders")}
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cash View */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <DollarSign size={14} /> Cash View
            </span>
          </div>
          <div className="dashboard-card-body">
            <div className="cash-tab-bar">
              {(["today", "week", "month"] as const).map((t) => (
                <button
                  key={t}
                  className={`cash-tab ${cashTab === t ? "active" : ""}`}
                  onClick={() => setCashTab(t)}
                >
                  {t === "today"
                    ? "Hari Ini"
                    : t === "week"
                      ? "Minggu"
                      : "Bulan"}
                </button>
              ))}
            </div>

            <div className="cash-row">
              <span className="cash-row-label">Total Penjualan</span>
              <span className="cash-row-value">
                Rp
                {fmt(
                  cashTab === "today"
                    ? daily?.revenue
                    : cashTab === "week"
                      ? Number(daily?.revenue ?? 0) * 7
                      : monthly?.revenue,
                )}
              </span>
            </div>
            <div className="cash-row">
              <span className="cash-row-label">Jumlah Dokumen</span>
              <span className="cash-row-value">
                {cashTab === "today"
                  ? (daily?.order_count ?? 0)
                  : cashTab === "week"
                    ? Number(daily?.order_count ?? 0) * 7
                    : (monthly?.order_count ?? 0)}
              </span>
            </div>
            <div className="cash-row">
              <span className="cash-row-label">Produk Terlaris</span>
              <span className="cash-row-value">{topProd[0]?.name ?? "—"}</span>
            </div>
            <div className="cash-row">
              <span className="cash-row-label">Pesanan Aktif</span>
              <span className="cash-row-value">{openOrd.length}</span>
            </div>

            {/* Top products mini list */}
            {topProd.slice(0, 3).map((p: any, i: number) => (
              <div key={i} className="cash-row">
                <span className="cash-row-label">
                  {i + 1}. {p.name}
                </span>
                <span className="cash-row-value">{p.units_sold} unit</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCloseModal && (
        <CloseRegisterModal
          onClose={() => {
            setShowCloseModal(false);
            refresh();
          }}
        />
      )}
    </PosAppShell>
  );
}
