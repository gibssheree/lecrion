import { ReactNode, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Store,
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useStoreCapabilities } from "../../hooks/useStoreCapabilities";
import {
  CHATBOT_NAV,
  MAIN_NAV,
  NavigationItem,
} from "../../navigation/navigation.registry";
import { requestBusinessProfile } from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import lecrionLogo from "../../public/Lecrion.png";

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

const BUSINESS_VERTICAL_OPTIONS = [
  { value: "general", label: "General" },
  { value: "retail_store", label: "Retail Store" },
  { value: "grocery_minimarket", label: "Grocery / Minimarket" },
  { value: "restaurant_cafe", label: "Restaurant / Cafe" },
  { value: "wholesale_distribution", label: "Wholesale / Distribution" },
  { value: "warehouse_logistics", label: "Warehouse / Logistics" },
  { value: "manufacturing_production", label: "Manufacturing / Production" },
  { value: "building_materials", label: "Building Materials" },
  { value: "services_repair_shop", label: "Services / Repair Shop" },
  { value: "health_wellness", label: "Health / Wellness" },
];

function businessVerticalLabel(value?: string | null) {
  return (
    BUSINESS_VERTICAL_OPTIONS.find((o) => o.value === value)?.label ?? "General"
  );
}

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
    hasModule,
    reload: reloadCapabilities,
  } = useStoreCapabilities();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [requestedVertical, setRequestedVertical] = useState(businessVertical);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const canRequestCategory = ["owner", "manager"].includes(user?.role ?? "");
  const pendingVertical = capabilities?.requestedBusinessVertical ?? null;
  const hasPendingCategory =
    Boolean(pendingVertical) && pendingVertical !== businessVertical;

  const visibleMainNav = useMemo(
    () => MAIN_NAV.filter((item) => canShowItem(item, hasModule, permissions)),
    [hasModule, permissions],
  );

  const visibleChatbotNav = useMemo(
    () =>
      CHATBOT_NAV.filter((item) => canShowItem(item, hasModule, permissions)),
    [hasModule, permissions],
  );

  useEffect(() => {
    setRequestedVertical(pendingVertical ?? businessVertical);
  }, [businessVertical, pendingVertical]);

  useEffect(() => {
    if (sidebarCollapsed) setCategoryOpen(false);
  }, [sidebarCollapsed]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleSelectCategory(nextVertical: string) {
    setCategoryError(null);
    setRequestedVertical(nextVertical);
    if (!canRequestCategory) {
      setCategoryError("Hanya owner atau manager yang bisa ajukan kategori.");
      return;
    }
    if (nextVertical === requestedVertical && hasPendingCategory) {
      setCategoryOpen(false);
      return;
    }
    setCategorySaving(true);
    try {
      await requestBusinessProfile(nextVertical);
      await reloadCapabilities();
      setCategoryOpen(false);
    } catch (err) {
      setCategoryError(
        err instanceof Error ? err.message : "Gagal mengirim request kategori.",
      );
    } finally {
      setCategorySaving(false);
    }
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
          <div className="pos-store-switcher">
            {!sidebarCollapsed ? (
              <>
                <div className="pos-store-icon-box">
                  <Store size={18} strokeWidth={2} />
                </div>

                <div className="pos-store-info">
                  <span className="pos-store-name">Canteen</span>
                  <button
                    type="button"
                    className={`pos-store-category-trigger${categoryOpen ? " open" : ""}`}
                    onClick={() => setCategoryOpen((v) => !v)}
                    aria-expanded={categoryOpen}
                  >
                    <span>{businessVerticalLabel(businessVertical)}</span>
                    <ChevronDown size={11} />
                  </button>
                  {hasPendingCategory && (
                    <div className="pos-store-category-pending-inline">
                      Pending: {businessVerticalLabel(pendingVertical)}
                    </div>
                  )}
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

            {categoryOpen && !sidebarCollapsed && (
              <div className="pos-store-category-menu">
                <div className="pos-store-category-menu-label">
                  Kategori Bisnis
                </div>
                <div className="pos-store-category-options">
                  {BUSINESS_VERTICAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`pos-store-category-option${requestedVertical === option.value ? " selected" : ""}`}
                      onClick={() => handleSelectCategory(option.value)}
                      disabled={categorySaving}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {categoryError && (
                  <div className="pos-store-category-error">
                    {categoryError}
                  </div>
                )}
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
