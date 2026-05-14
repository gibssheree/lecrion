import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Bot,
  MessageSquare,
  Radio,
  Package,
  Warehouse,
  Brain,
  Settings as SettingsIcon,
  DollarSign,
  LogOut,
} from "lucide-react";
import { ROUTES } from "../../routes/routePaths";
import { useAuth } from "../../store/auth.store";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

const MAIN_NAV: NavItem[] = [
  { to: ROUTES.BOT_OVERVIEW, icon: <Bot size={16} />, label: "Bot Overview" },
  { to: ROUTES.CHAT, icon: <MessageSquare size={16} />, label: "Chat History" },
  { to: ROUTES.LIVE, icon: <Radio size={16} />, label: "Live Feed" },
  { to: ROUTES.ORDERS, icon: <Package size={16} />, label: "Pesanan" },
  { to: ROUTES.INVENTORY, icon: <Warehouse size={16} />, label: "Stok Barang" },
  { to: ROUTES.CASHFLOW, icon: <DollarSign size={16} />, label: "Cashflow" },
];

const TOOLS_NAV: NavItem[] = [
  { to: ROUTES.LLM, icon: <Brain size={16} />, label: "LLM Console" },
  {
    to: ROUTES.SETTINGS,
    icon: <SettingsIcon size={16} />,
    label: "Pengaturan",
  },
];

interface SidebarProps {
  /** @deprecated Pass nothing — reads from useAuth() store */
  userEmail?: string;
  /** @deprecated Pass nothing — reads from useAuth() store */
  onLogout?: () => void;
}

export function Sidebar(_props: SidebarProps = {}) {
  const { userEmail, handleLogout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <MessageSquare size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h1>Lecrion</h1>
          <span>Chatbot Dashboard</span>
        </div>
      </div>

      <div className="sidebar-section">Chatbot</div>
      {MAIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div className="sidebar-section" style={{ marginTop: 8 }}>
        Tools
      </div>
      {TOOLS_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}

      <div
        style={{
          marginTop: "auto",
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        {userEmail && (
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 120,
              }}
            >
              {userEmail}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Keluar"
              style={{
                padding: "2px 6px",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
        <div>Lecrion — Chatbot Dashboard</div>
        <div style={{ marginTop: 2 }}>v1.0.0-beta</div>
      </div>
    </aside>
  );
}
