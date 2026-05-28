import { ReactNode } from "react";
import {
  Activity,
  BarChart2,
  Bot,
  Boxes,
  Building2,
  ClipboardList,
  DollarSign,
  FileText,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  Radio,
  Receipt,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCog,
  UtensilsCrossed,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { PermissionKey } from "../hooks/usePermissions";

export interface NavigationItem {
  id: string;
  to: string;
  icon: ReactNode;
  label: string;
  /**
   * Module-gating key. For support-only items use "platform.support" — this is
   * a virtual module that only support sees (not gated by store capabilities).
   */
  requiredModule: string;
  end?: boolean;
  requirePermission?: PermissionKey;
  section: "core" | "operations" | "vertical" | "admin" | "chatbot" | "support";
  /**
   * Hide this item entirely when the user is support — even if technically
   * the gate would let them in. Used to keep support out of merchant-internal
   * pages (cashflow, invoices, sales reports).
   */
  hideForSupport?: boolean;
}

export const MAIN_NAV: NavigationItem[] = [
  {
    id: "dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard size={17} />,
    label: "Dashboard",
    requiredModule: "core.dashboard",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "pos",
    to: "/kasir",
    icon: <ShoppingCart size={17} />,
    label: "Kasir",
    requiredModule: "core.pos",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "orders",
    to: "/orders",
    icon: <Package size={17} />,
    label: "Pesanan",
    requiredModule: "core.sales",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "products",
    to: "/products",
    icon: <Boxes size={17} />,
    label: "Produk",
    requiredModule: "core.inventory",
    requirePermission: "canManageProducts",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "categories",
    to: "/categories",
    icon: <FolderTree size={17} />,
    label: "Kategori",
    requiredModule: "core.inventory",
    requirePermission: "canManageProducts",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "inventory",
    to: "/inventory",
    icon: <Warehouse size={17} />,
    label: "Inventori",
    requiredModule: "core.inventory",
    requirePermission: "canManageInventory",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "operations",
    to: "/operations",
    icon: <FileText size={17} />,
    label: "PO / GR / Transfer",
    requiredModule: "core.inventory",
    requirePermission: "canManageInventory",
    section: "operations",
    hideForSupport: true,
  },
  {
    id: "suppliers",
    to: "/suppliers",
    icon: <Truck size={17} />,
    label: "Supplier",
    requiredModule: "core.suppliers",
    requirePermission: "canManageInventory",
    section: "operations",
    hideForSupport: true,
  },
  {
    id: "invoices",
    to: "/invoices",
    icon: <Receipt size={17} />,
    label: "Invoices",
    requiredModule: "core.payments",
    requirePermission: "canViewCashflow",
    section: "operations",
    hideForSupport: true,
  },
  {
    id: "cashflow",
    to: "/cashflow",
    icon: <DollarSign size={17} />,
    label: "Manajemen Kas",
    requiredModule: "core.payments",
    requirePermission: "canViewCashflow",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "reports",
    to: "/reports",
    icon: <BarChart2 size={17} />,
    label: "Laporan",
    requiredModule: "core.reports",
    requirePermission: "canViewAllReports",
    section: "core",
    hideForSupport: true,
  },
  {
    id: "kds",
    to: "/kds",
    icon: <UtensilsCrossed size={17} />,
    label: "KDS / Dapur",
    requiredModule: "fnb.kds",
    section: "vertical",
    hideForSupport: true,
  },
];
// "Pengguna" and "Pengaturan" are intentionally excluded from the sidebar —
// both are accessible via the profile dropdown → /settings/:section

export const CHATBOT_NAV: NavigationItem[] = [
  {
    id: "chatbot-overview",
    to: "/chatbot",
    icon: <Bot size={17} />,
    label: "Bot Overview",
    requiredModule: "core.dashboard",
    end: true,
    section: "chatbot",
    hideForSupport: true,
  },
  {
    id: "chatbot-chats",
    to: "/chatbot/chats",
    icon: <MessageSquare size={17} />,
    label: "Chat History",
    requiredModule: "core.dashboard",
    section: "chatbot",
    hideForSupport: true,
  },
  {
    id: "chatbot-live",
    to: "/chatbot/live",
    icon: <Radio size={17} />,
    label: "Live Feed",
    requiredModule: "core.dashboard",
    section: "chatbot",
    hideForSupport: true,
  },
  {
    id: "chatbot-llm",
    to: "/chatbot/llm",
    icon: <Wrench size={17} />,
    label: "LLM Console",
    requiredModule: "core.dashboard",
    section: "chatbot",
    hideForSupport: true,
  },
  {
    id: "chatbot-settings",
    to: "/chatbot/settings",
    icon: <Settings size={17} />,
    label: "Bot Settings",
    requiredModule: "core.dashboard",
    section: "chatbot",
    hideForSupport: true,
  },
];

/**
 * Support-only navigation. Use `requirePermission: "canManageAllStores"`
 * (or other support-only flags) so it's invisible to non-support roles.
 * The `requiredModule` is "platform.support" — a virtual module that the
 * sidebar gate-passes for support users.
 */
export const SUPPORT_NAV: NavigationItem[] = [
  {
    id: "support-dashboard",
    to: "/support",
    icon: <LayoutDashboard size={17} />,
    label: "Dashboard",
    requiredModule: "platform.support",
    requirePermission: "canManageAllStores",
    end: true,
    section: "support",
  },
  {
    id: "support-merchants",
    to: "/support/merchants",
    icon: <Building2 size={17} />,
    label: "Merchant",
    requiredModule: "platform.support",
    requirePermission: "canManageAllStores",
    section: "support",
  },
  {
    id: "support-verification",
    to: "/support/verifikasi",
    icon: <ShieldCheck size={17} />,
    label: "Verifikasi",
    requiredModule: "platform.support",
    requirePermission: "canVerifyStores",
    section: "support",
  },
  {
    id: "support-llm",
    to: "/support/llm",
    icon: <Wrench size={17} />,
    label: "LLM Platform",
    requiredModule: "platform.support",
    requirePermission: "canConfigureLlmPlatform",
    section: "support",
  },
  {
    id: "support-audit",
    to: "/support/audit",
    icon: <ClipboardList size={17} />,
    label: "Audit Log",
    requiredModule: "platform.support",
    requirePermission: "canViewAuditLogs",
    section: "support",
  },
  {
    id: "support-health",
    to: "/support/health",
    icon: <Server size={17} />,
    label: "System Health",
    requiredModule: "platform.support",
    requirePermission: "canViewSystemHealth",
    section: "support",
  },
];
