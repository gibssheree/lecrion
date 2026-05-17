import { useEffect, useState } from "react";
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
  TrendingDown,
  CreditCard,
  Banknote,
} from "lucide-react";
import PosAppShell from "../components/layout/PosAppShell";
import { useApi } from "../hooks/useApi";
import { useRegisterStore } from "../store/register.store";
import {
  getReportSnapshots,
  getOrders,
  getSessionSummary,
  SessionSummary,
} from "../services/api";
import CloseRegisterModal from "../features/register/CloseRegisterModal";
import RegisterGatePage from "../features/register/RegisterGatePage";
import SuspendResumeButton from "../features/register/SuspendResumeButton";
import { useSocket } from "../hooks/useSocket";

const DASHBOARD_EVENTS = [
  "order.created",
  "order.confirmed",
  "payment.confirmed",
  "cashflow.income.recorded",
  "register.opened",
  "register.closed",
  "stock.adjusted",
  "stock.low",
] as const;
const DASHBOARD_EVENT_SET = new Set<string>(DASHBOARD_EVENTS);

function describeDashboardEvent(
  eventName: string,
  data: Record<string, unknown>,
) {
  switch (eventName) {
    case "order.created":
      return `Order #${String(data.orderId ?? "—")} dibuat`;
    case "order.confirmed":
      return `Order #${String(data.orderId ?? "—")} dikonfirmasi`;
    case "payment.confirmed":
      return `Pembayaran order #${String(data.orderId ?? "—")} dikonfirmasi`;
    case "cashflow.income.recorded":
      return "Pemasukan kas dicatat";
    case "register.opened":
      return "Register dibuka";
    case "register.closed":
      return "Register ditutup";
    case "stock.adjusted":
      return `Stok ${String(data.name ?? data.productId ?? "produk")} disesuaikan`;
    case "stock.low":
      return `Stok ${String(data.name ?? data.productId ?? "produk")} menipis`;
    default:
      return eventName;
  }
}

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

  // Phase 2: shift summary state
  const [shiftSummary, setShiftSummary] = useState<SessionSummary | null>(null);
  const [shiftSummaryLoading, setShiftSummaryLoading] = useState(false);

  const navigate = useNavigate();
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const refresh = useRegisterStore((s) => s.refresh);

  const snapshots = useApi2(getReportSnapshots);
  const orders = useApi2(() => getOrders("all", 20));
  const reloadSnapshots = snapshots.reload;
  const reloadOrders = orders.reload;
  const { events, connected } = useSocket([...DASHBOARD_EVENTS]);
  const latestEvent = events[0] ?? null;

  // Load shift summary when session changes or on sale events
  async function loadShiftSummary(sessionId: number) {
    setShiftSummaryLoading(true);
    try {
      const data = await getSessionSummary(sessionId);
      setShiftSummary(data);
    } catch {
      // Non-fatal — shift summary is supplemental
    } finally {
      setShiftSummaryLoading(false);
    }
  }

  useEffect(() => {
    if (session?.id) {
      void loadShiftSummary(session.id);
    } else {
      setShiftSummary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    if (!latestEvent || !DASHBOARD_EVENT_SET.has(latestEvent.eventName)) {
      return;
    }

    void Promise.all([
      reloadSnapshots(),
      reloadOrders(),
      refresh(),
      // Reload shift summary on sale/cashflow events
      ...(session?.id &&
      (latestEvent.eventName === "order.confirmed" ||
        latestEvent.eventName === "cashflow.income.recorded" ||
        latestEvent.eventName === "payment.confirmed")
        ? [loadShiftSummary(session.id)]
        : []),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestEvent, refresh, reloadOrders, reloadSnapshots]);

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
            <TrendingUp size={12} color="var(--stock-ok)" /> Revenue Hari Ini
          </div>
          <div className="summary-card-value">Rp{fmt(daily?.revenue)}</div>
          <div className="summary-card-sub">
            {daily?.order_count ?? 0} transaksi
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <ShoppingBag size={12} color="var(--primary)" /> Penjualan Bulan Ini
          </div>
          <div className="summary-card-value">Rp{fmt(monthly?.revenue)}</div>
          <div className="summary-card-sub">
            {monthly?.order_count ?? 0} pesanan
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <Package size={12} color="var(--stock-low)" /> Pesanan Aktif
          </div>
          <div className="summary-card-value">{openOrd.length}</div>
          <div className="summary-card-sub">belum selesai</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">
            <DollarSign size={12} color="var(--stock-ok)" /> Status Register
          </div>
          <div
            className="summary-card-value"
            style={{
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
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
                flexShrink: 0,
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
              onClick={() => {
                void refresh();
                if (session?.id) void loadShiftSummary(session.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                minHeight: 28,
              }}
            >
              <RefreshCw
                size={12}
                style={{
                  animation: shiftSummaryLoading
                    ? "spin 1s linear infinite"
                    : "none",
                }}
              />
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
                  <SuspendResumeButton />
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
                    <ShoppingCart size={14} /> Lanjutkan Sesi
                  </button>
                  <SuspendResumeButton />
                </div>
              )}
            </div>

            {/* ── Phase 2: Shift summary panel ─────────────────── */}
            {shiftSummary ? (
              <>
                {/* Expected cash — primary figure */}
                <div
                  style={{
                    background: "var(--surface-2, #f0fdf4)",
                    border: "1px solid var(--border, #bbf7d0)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Banknote size={11} /> Kas Diharapkan (Sistem)
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--stock-ok)",
                    }}
                  >
                    Rp{fmt(shiftSummary.expectedCash)}
                  </div>
                </div>

                {/* Cash sales */}
                <div className="shift-row">
                  <span
                    className="shift-row-label"
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Banknote size={11} /> Penjualan Tunai
                  </span>
                  <span className="shift-row-value">
                    Rp{fmt(shiftSummary.cashSales)}
                  </span>
                </div>

                {/* Non-cash sales */}
                {shiftSummary.nonCashSales.map((nc) => (
                  <div key={nc.method} className="shift-row">
                    <span
                      className="shift-row-label"
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CreditCard size={11} /> {nc.method}
                    </span>
                    <span className="shift-row-value">Rp{fmt(nc.total)}</span>
                  </div>
                ))}

                {/* Cash in/out */}
                {shiftSummary.cashIn > 0 && (
                  <div className="shift-row">
                    <span
                      className="shift-row-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--stock-ok)",
                      }}
                    >
                      <TrendingUp size={11} /> Kas Masuk
                    </span>
                    <span
                      className="shift-row-value"
                      style={{ color: "var(--stock-ok)" }}
                    >
                      +Rp{fmt(shiftSummary.cashIn)}
                    </span>
                  </div>
                )}
                {shiftSummary.cashOut > 0 && (
                  <div className="shift-row">
                    <span
                      className="shift-row-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: "var(--danger, #ef4444)",
                      }}
                    >
                      <TrendingDown size={11} /> Kas Keluar
                    </span>
                    <span
                      className="shift-row-value"
                      style={{ color: "var(--danger, #ef4444)" }}
                    >
                      -Rp{fmt(shiftSummary.cashOut)}
                    </span>
                  </div>
                )}

                {/* Transaction count */}
                <div className="shift-row">
                  <span className="shift-row-label">Jumlah Transaksi</span>
                  <span className="shift-row-value">
                    {shiftSummary.transactionCount}
                  </span>
                </div>

                {/* Opening cash */}
                <div className="shift-row">
                  <span className="shift-row-label">Modal Awal</span>
                  <span className="shift-row-value">
                    Rp{fmt(shiftSummary.openingCash)}
                  </span>
                </div>

                {/* First/last sale time */}
                {shiftSummary.firstSaleTime && (
                  <div className="shift-row">
                    <span className="shift-row-label">Transaksi Pertama</span>
                    <span className="shift-row-value" style={{ fontSize: 11 }}>
                      {new Date(shiftSummary.firstSaleTime).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>
                )}
                {shiftSummary.lastSaleTime && (
                  <div className="shift-row">
                    <span className="shift-row-label">Transaksi Terakhir</span>
                    <span className="shift-row-value" style={{ fontSize: 11 }}>
                      {new Date(shiftSummary.lastSaleTime).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Fallback to snapshot data when summary not loaded */
              <>
                <div className="shift-row">
                  <span className="shift-row-label">Penjualan Hari Ini</span>
                  <span className="shift-row-value">
                    Rp{fmt(daily?.revenue)}
                  </span>
                </div>
                <div className="shift-row">
                  <span className="shift-row-label">Jumlah Transaksi</span>
                  <span className="shift-row-value">
                    {daily?.order_count ?? 0}
                  </span>
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
              </>
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
                  {describeDashboardEvent(e.eventName, e.data)}
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
                      ? "Minggu (est.)"
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
                      ? monthly?.revenue != null
                        ? Math.round(Number(monthly.revenue) / 4)
                        : 0
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
                    ? monthly?.order_count != null
                      ? Math.round(Number(monthly.order_count) / 4)
                      : 0
                    : (monthly?.order_count ?? 0)}
                {cashTab === "week" && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      marginLeft: 4,
                    }}
                  >
                    (est.)
                  </span>
                )}
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
