import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Store,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useStoreCapabilities } from "../../hooks/useStoreCapabilities";
import { useApi } from "../../hooks/useApi";
import { getStoreInfo } from "../../services/api";
import {
  CHATBOT_NAV,
  MAIN_NAV,
  NavigationItem,
} from "../../navigation/navigation.registry";
import { useAuthStore } from "../../store/auth.store";
const lecrionLogo = "/Lecrion.png";

interface Props {
  children: ReactNode;
  title?: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Kasir",
  inventory_staff: "Inventori",
  support: "Support",
};

const VERTICAL_LABELS: Record<string, string> = {
  restaurant_cafe: "Restoran",
  cafe: "Cafe",
  retail_store: "Retail Store",
  accommodation: "Akomodasi / Hotel",
  building_materials: "Toko Bangunan",
  general: "General",
};

function verticalLabel(value?: string | null) {
  return VERTICAL_LABELS[value ?? ""] ?? value ?? "General";
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  verified: { label: "Terverifikasi", color: "#22c55e" },
  pending: { label: "Menunggu Verifikasi", color: "#f59e0b" },
  unverified: { label: "Belum Diverifikasi", color: "#94a3b8" },
};

function canShowItem(
  item: NavigationItem,
  hasModule: (moduleKey: string) => boolean,
  permissions: ReturnType<typeof usePermissions>,
) {
  if (!hasModule(item.requiredModule)) return false;
  if (!item.requirePermission) return true;
  return Boolean(permissions[item.requirePermission]);
}

export default function PosAppShell({ children, title }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const permissions = usePermissions();
  const {
    data: capabilities,
    businessVertical,
    verificationStatus,
    hasModule,
  } = useStoreCapabilities();
  const storeInfo = useApi(getStoreInfo, []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bizInfoOpen, setBizInfoOpen] = useState(false);
  const bizInfoRef = useRef<HTMLDivElement>(null);

  const pendingVertical = capabilities?.requestedBusinessVertical ?? null;
  const hasPending = Boolean(pendingVertical) && pendingVertical !== businessVertical;

  const visibleMainNav = useMemo(
    () => MAIN_NAV.filter((item) => canShowItem(item, hasModule, permissions)),
    [hasModule, permissions],
  );

  const visibleChatbotNav = useMemo(
    () => CHATBOT_NAV.filter((item) => canShowItem(item, hasModule, permissions)),
    [hasModule, permissions],
  );

  useEffect(() => {
    if (sidebarCollapsed) setBizInfoOpen(false);
  }, [sidebarCollapsed]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bizInfoRef.current && !bizInfoRef.current.contains(e.target as Node)) {
        setBizInfoOpen(false);
      }
    }
    if (bizInfoOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bizInfoOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function renderNavItem(item: NavigationItem) {
    return (
      <NavLink
        key={item.id}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `pos-nav-item${isActive ? " active" : ""}`}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </NavLink>
    );
  }

  const displayName = user?.actor ?? user?.email ?? "User";
  const roleLabel = ROLE_LABELS[user?.role ?? ""] ?? "User";
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <div className={`pos-app${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      {/* ── Navbar — full width ── */}
      <header className="pos-navbar">
        <img src={lecrionLogo} alt="Lecrion" className="pos-navbar-logo" />

        <div className="pos-navbar-actions">
          <button
            type="button"
            className="pos-navbar-icon-btn"
            aria-label="Notifikasi"
          >
            <Bell size={18} />
          </button>

          <div className="pos-navbar-user">
            <div className="pos-navbar-avatar">{avatarLetter}</div>
            <div className="pos-navbar-user-meta">
              <span className="pos-navbar-user-name">{displayName}</span>
              <span className="pos-navbar-user-role">{roleLabel}</span>
            </div>
          </div>

          <button
            type="button"
            className="pos-navbar-icon-btn"
            aria-label="Menu lainnya"
          >
            <MoreHorizontal size={18} />
          </button>

          <button
            type="button"
            className="pos-navbar-icon-btn"
            aria-label="Keluar"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + content ── */}
      <div className="pos-body">
        <aside className="pos-sidebar">
          {/* Store switcher */}
          <div className="pos-store-switcher" ref={bizInfoRef}>
            {!sidebarCollapsed ? (
              <>
                <div className="pos-store-icon-box">
                  <Store size={18} strokeWidth={2} />
                </div>

                <div className="pos-store-info">
                  <span className="pos-store-name">
                    {storeInfo.data?.name ?? "Store"}
                  </span>
                  <button
                    type="button"
                    className={`pos-store-category-trigger${bizInfoOpen ? " open" : ""}`}
                    onClick={() => setBizInfoOpen((v) => !v)}
                    aria-expanded={bizInfoOpen}
                  >
                    <span>{verticalLabel(businessVertical)}</span>
                    <ChevronDown size={11} />
                  </button>
                </div>

                <button
                  type="button"
                  className="pos-sidebar-toggle-btn"
                  onClick={() => setSidebarCollapsed(true)}
                  aria-label="Tutup sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="pos-sidebar-toggle-btn pos-sidebar-toggle-btn--center"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Buka sidebar"
              >
                <PanelLeftOpen size={16} />
              </button>
            )}

            {/* Business info panel */}
            {bizInfoOpen && !sidebarCollapsed && (
              <div className="pos-biz-panel">
                {/* Vertical + status */}
                <div className="pos-biz-panel-row">
                  <span className="pos-biz-panel-label">Jenis Bisnis</span>
                  <span className="pos-biz-panel-value">
                    {verticalLabel(businessVertical)}
                  </span>
                </div>

                <div className="pos-biz-panel-row">
                  <span className="pos-biz-panel-label">Status</span>
                  <span
                    className="pos-biz-panel-status"
                    style={{
                      color: STATUS_CONFIG[verificationStatus]?.color ?? "#94a3b8",
                    }}
                  >
                    <span
                      className="pos-biz-status-dot"
                      style={{
                        background: STATUS_CONFIG[verificationStatus]?.color ?? "#94a3b8",
                      }}
                    />
                    {STATUS_CONFIG[verificationStatus]?.label ?? verificationStatus}
                  </span>
                </div>

                {hasPending && (
                  <div className="pos-biz-panel-pending">
                    Pending: {verticalLabel(pendingVertical)}
                  </div>
                )}

                <button
                  type="button"
                  className="pos-biz-panel-manage-btn"
                  onClick={() => {
                    setBizInfoOpen(false);
                    navigate("/settings");
                  }}
                >
                  <Settings size={13} />
                  Kelola Bisnis
                </button>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="pos-sidebar-nav" aria-label="POS navigation">
            <div className="pos-sidebar-section">Menu</div>
            {visibleMainNav.map(renderNavItem)}

            {visibleChatbotNav.length > 0 && (
              <>
                <div className="pos-sidebar-section chatbot-section">
                  Chatbot
                </div>
                {visibleChatbotNav.map(renderNavItem)}
              </>
            )}
          </nav>

          <div className="pos-sidebar-footer" />
        </aside>

        {/* Content */}
        <main className="pos-content">
          {title && (
            <div className="pos-page-header">
              <h2 className="pos-page-heading">{title}</h2>
            </div>
          )}
          <div className="pos-page-body">{children}</div>
        </main>
      </div>
    </div>
  );
}
