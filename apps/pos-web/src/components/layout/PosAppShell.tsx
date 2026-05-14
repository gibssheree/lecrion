import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  Warehouse,
  DollarSign,
  BarChart2,
  Settings,
  LogOut,
  MessageSquare,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: "/dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
  { to: "/kasir", icon: <ShoppingCart size={16} />, label: "Kasir" },
  { to: "/orders", icon: <Package size={16} />, label: "Pesanan" },
  { to: "/inventory", icon: <Warehouse size={16} />, label: "Inventori" },
  { to: "/cashflow", icon: <DollarSign size={16} />, label: "Manajemen Kas" },
  { to: "/reports", icon: <BarChart2 size={16} />, label: "Laporan" },
  { to: "/settings", icon: <Settings size={16} />, label: "Pengaturan" },
];

// Link ke apps/dashboard (chatbot dashboard) di port 5173
const CHATBOT_DASHBOARD_URL = "http://localhost:5173";

interface Props {
  children: ReactNode;
  title?: string;
}

export default function PosAppShell({ children, title }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const status = useRegisterStore((s) => s.status);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const statusColor =
    status === "open"
      ? "#22c55e"
      : status === "suspended"
        ? "#f59e0b"
        : "#94a3b8";
  const statusLabel =
    status === "open"
      ? "OPEN"
      : status === "suspended"
        ? "SUSPENDED"
        : "NO SESSION";

  return (
    <div className="pos-app">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="pos-sidebar">
        <div className="pos-sidebar-brand">
          <div className="brand-icon">
            <ShoppingBag size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h1>Lecrion POS</h1>
            <span>Cashier System</span>
          </div>
        </div>

        <div className="pos-sidebar-section">Menu</div>
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `pos-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {/* Chatbot Dashboard link */}
        <div className="pos-sidebar-section" style={{ marginTop: 8 }}>
          Integrasi
        </div>
        <a
          href={CHATBOT_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pos-nav-item"
        >
          <span className="nav-icon">
            <MessageSquare size={16} />
          </span>
          <span>Chatbot Dashboard</span>
          <ExternalLink
            size={11}
            style={{ marginLeft: "auto", opacity: 0.5 }}
          />
        </a>

        {/* Footer */}
        <div className="pos-sidebar-footer">
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: statusColor,
                display: "inline-block",
              }}
            />
            <span style={{ color: statusColor, fontWeight: 600 }}>
              {statusLabel}
            </span>
          </div>
          <div
            style={{
              marginBottom: 4,
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.email}
          </div>
          <button
            className="pos-nav-item"
            onClick={handleLogout}
            style={{ width: "100%", margin: "4px 0 0", padding: "7px 0" }}
          >
            <span className="nav-icon">
              <LogOut size={14} />
            </span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────── */}
      <div className="pos-content">
        {/* Top bar */}
        <div className="pos-topbar">
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {title ?? "Dashboard"}
          </h2>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "5px 10px",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--stock-ok)",
                  display: "inline-block",
                }}
              />
              Online
            </div>
          </div>
        </div>

        {/* Page body */}
        <div className="pos-page-body">{children}</div>
      </div>
    </div>
  );
}
