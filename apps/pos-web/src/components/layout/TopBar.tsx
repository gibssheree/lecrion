// apps/pos-web/src/components/layout/TopBar.tsx
// Phase 12: Enterprise UI polish — compact, informative, always-visible state

import { useState, useEffect } from "react";
import {
  User,
  Clock,
  Wifi,
  WifiOff,
  Lock,
  ClipboardList,
  RefreshCw,
  Store,
} from "lucide-react";

import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";
import SuspendResumeButton from "../../features/register/SuspendResumeButton";
import CloseRegisterModal from "../../features/register/CloseRegisterModal";
import { getOrders } from "../../services/api";
import { useOnlineContext } from "../../app/OnlineStatusProvider";

const lecrionLogo = "/Lecrion.png";

interface Props {
  onOpenOrders: () => void;
}

function useClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 10_000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function TopBar({ onOpenOrders }: Props) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const user = useAuthStore((s) => s.user);
  const session = useRegisterStore((s) => s.session);
  const status = useRegisterStore((s) => s.status);
  const time = useClock();
  const { isOnline, isBrowserOffline, pendingCount, isSyncing, triggerSync } =
    useOnlineContext();

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await getOrders("all", 100);
        const today = new Date().toDateString();
        const count = (res.orders ?? []).filter(
          (o: any) => new Date(o.created_at).toDateString() === today,
        ).length;
        setTodayCount(count);
      } catch {
        /* ignore */
      }
    }
    fetchCount();
    const t = setInterval(fetchCount, 30_000);
    return () => clearInterval(t);
  }, []);

  const chipClass: Record<string, string> = {
    open: "topbar-chip topbar-chip--open",
    suspended: "topbar-chip topbar-chip--suspended",
    closed: "topbar-chip topbar-chip--closed",
    none: "topbar-chip topbar-chip--none",
  };

  const statusLabel: Record<string, string> = {
    open: "OPEN",
    suspended: "SUSPENDED",
    closed: "CLOSED",
    none: "NO SESSION",
  };

  return (
    <>
      <div className="topbar">
        {/* Brand */}
        <div className="topbar-brand">
          <img src={lecrionLogo} alt="Lecrion" className="topbar-logo" />
        </div>

        <div className="topbar-divider" />

        {/* Register status chip */}
        {session ? (
          <span className={chipClass[status]}>
            <Store size={10} />
            Reg #{session.id} · {statusLabel[status]}
          </span>
        ) : (
          <span className={chipClass["none"]}>
            <Store size={10} />
            {statusLabel["none"]}
          </span>
        )}

        <div className="topbar-divider" />

        {/* Cashier */}
        <div className="topbar-info">
          <User size={12} />
          <span
            style={{
              maxWidth: 120,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.email ?? "Kasir"}
          </span>
          {user?.role && user.role !== "cashier" && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: 8,
                background:
                  user.role === "owner"
                    ? "rgba(139,92,246,0.12)"
                    : "rgba(59,130,246,0.12)",
                color:
                  user.role === "owner" ? "#7c3aed" : "var(--primary-dark)",
                border: `1px solid ${user.role === "owner" ? "rgba(139,92,246,0.25)" : "rgba(59,130,246,0.25)"}`,
                textTransform: "uppercase" as const,
                letterSpacing: "0.3px",
                flexShrink: 0,
              }}
            >
              {user.role === "owner" ? "Owner" : "Mgr"}
            </span>
          )}
        </div>

        <div className="topbar-divider" />

        {/* Clock */}
        <div className="topbar-info">
          <Clock size={12} />
          {time}
        </div>

        <div className="topbar-divider" />

        {/* Connection status */}
        <div className="topbar-info">
          {isBrowserOffline ? (
            <>
              <WifiOff size={12} color="var(--stock-out)" />
              <span style={{ color: "var(--stock-out)", fontWeight: 600 }}>
                Offline
              </span>
            </>
          ) : !isOnline ? (
            <>
              <WifiOff size={12} color="var(--stock-low)" />
              <span style={{ color: "var(--stock-low)", fontWeight: 600 }}>
                Terbatas
              </span>
            </>
          ) : (
            <>
              <Wifi size={12} color="var(--stock-ok)" />
              <span style={{ color: "var(--stock-ok)", fontWeight: 600 }}>
                Online
              </span>
            </>
          )}
        </div>

        {/* Pending sync indicator */}
        {pendingCount > 0 && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            title={`${pendingCount} transaksi menunggu sinkronisasi`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: "var(--radius-sm)",
              background: "var(--stock-low-bg)",
              border: "1px solid var(--stock-low-border)",
              color: "var(--stock-low)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <RefreshCw
              size={10}
              style={{
                animation: isSyncing ? "spin 1s linear infinite" : "none",
              }}
            />
            {isSyncing ? "Sync…" : `${pendingCount} pending`}
          </button>
        )}

        {/* Actions */}
        <div className="topbar-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenOrders}
            style={{ gap: 5 }}
            title="Riwayat transaksi (F4)"
          >
            <ClipboardList size={13} />
            Transaksi
            {todayCount > 0 && (
              <span
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: "10px",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {todayCount}
              </span>
            )}
          </button>

          <SuspendResumeButton />

          {status === "open" && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowCloseModal(true)}
              style={{ gap: 5 }}
              title="Tutup register"
            >
              <Lock size={13} /> Tutup
            </button>
          )}
        </div>
      </div>

      {showCloseModal && (
        <CloseRegisterModal onClose={() => setShowCloseModal(false)} />
      )}
    </>
  );
}
