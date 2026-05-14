import { useState, useEffect } from "react";
import {
  ShoppingBag,
  User,
  Clock,
  Wifi,
  Lock,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";
import SuspendResumeButton from "../../features/register/SuspendResumeButton";
import CloseRegisterModal from "../../features/register/CloseRegisterModal";
import { getOrders } from "../../services/api";

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

  // Fetch today's order count
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

  const statusLabel: Record<string, string> = {
    open: "OPEN",
    suspended: "SUSPENDED",
    closed: "CLOSED",
    none: "NO SESSION",
  };
  const statusClass: Record<string, string> = {
    open: "status-badge--open",
    suspended: "status-badge--suspended",
    closed: "status-badge--closed",
    none: "status-badge--none",
  };

  return (
    <>
      <div className="topbar">
        {/* Brand */}
        <div className="topbar-brand">
          <ShoppingBag size={18} strokeWidth={2.5} />
          Lecrion POS
        </div>

        <div className="topbar-divider" />

        {/* Register status */}
        {session && (
          <span className={`status-badge ${statusClass[status]}`}>
            Register #{session.id} — {statusLabel[status]}
          </span>
        )}

        <div className="topbar-divider" />

        {/* Cashier */}
        <div className="topbar-info">
          <User size={13} />
          {user?.email ?? "Kasir"}
        </div>

        <div className="topbar-divider" />

        {/* Clock */}
        <div className="topbar-info">
          <Clock size={13} />
          {time}
        </div>

        <div className="topbar-divider" />

        {/* Connection */}
        <div className="topbar-info">
          <Wifi size={13} color="var(--stock-ok)" />
          Online
        </div>

        {/* Actions */}
        <div className="topbar-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenOrders}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <ClipboardList size={14} /> Transaksi
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
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <Lock size={14} /> Tutup Register
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
