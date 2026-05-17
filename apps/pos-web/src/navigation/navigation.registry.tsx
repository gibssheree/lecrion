import { ReactNode } from "react";
import {
  BarChart2,
  Bot,
  Boxes,
  DollarSign,
  FileText,
  FolderTree,
  LayoutDashboard,
  MessageSquare,
  Package,
  Radio,
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
  requiredModule: string;
  end?: boolean;
  requirePermission?: PermissionKey;
  section: "core" | "operations" | "vertical" | "admin" | "chatbot";
}

export const MAIN_NAV: NavigationItem[] = [
  {
    id: "dashboard",
    to: "/dashboard",
    icon: <LayoutDashboard size={15} />,
    label: "Dashboard",
    requiredModule: "core.dashboard",
    section: "core",
  },
  {
    id: "pos",
    to: "/kasir",
    icon: <ShoppingCart size={15} />,
    label: "Kasir",
    requiredModule: "core.pos",
    section: "core",
  },
  {
    id: "orders",
    to: "/orders",
    icon: <Package size={15} />,
    label: "Pesanan",
    requiredModule: "core.sales",
    section: "core",
  },
  {
    id: "products",
    to: "/products",
    icon: <Boxes size={15} />,
    label: "Produk",
    requiredModule: "core.inventory",
    requirePermission: "canManageProducts",
    section: "core",
  },
  {
    id: "categories",
    to: "/categories",
    icon: <FolderTree size={15} />,
    label: "Kategori",
    requiredModule: "core.inventory",
    requirePermission: "canManageProducts",
    section: "core",
  },
  {
    id: "inventory",
    to: "/inventory",
    icon: <Warehouse size={15} />,
    label: "Inventori",
    requiredModule: "core.inventory",
    requirePermission: "canManageInventory",
    section: "core",
  },
  {
    id: "operations",
    to: "/operations",
    icon: <FileText size={15} />,
    label: "PO / GR / Transfer",
    requiredModule: "core.inventory",
    requirePermission: "canManageInventory",
    section: "operations",
  },
  {
    id: "suppliers",
    to: "/suppliers",
    icon: <Truck size={15} />,
    label: "Supplier",
    requiredModule: "core.suppliers",
    requirePermission: "canManageInventory",
    section: "operations",
  },
  {
    id: "cashflow",
    to: "/cashflow",
    icon: <DollarSign size={15} />,
    label: "Manajemen Kas",
    requiredModule: "core.payments",
    requirePermission: "canViewCashflow",
    section: "core",
  },
  {
    id: "reports",
    to: "/reports",
    icon: <BarChart2 size={15} />,
    label: "Laporan",
    requiredModule: "core.reports",
    requirePermission: "canViewAllReports",
    section: "core",
  },
  {
    id: "kds",
    to: "/kds",
    icon: <UtensilsCrossed size={15} />,
    label: "KDS / Dapur",
    requiredModule: "fnb.kds",
    section: "vertical",
  },
  {
    id: "users",
    to: "/users",
    icon: <UserCog size={15} />,
    label: "Pengguna",
    requiredModule: "core.users",
    requirePermission: "canManageUsers",
    section: "admin",
  },
  {
    id: "settings",
    to: "/settings",
    icon: <Settings size={15} />,
    label: "Pengaturan",
    requiredModule: "core.settings",
    requirePermission: "canChangeSettings",
    section: "admin",
  },
  {
    id: "support-stores",
    to: "/support/stores",
    icon: <ShieldCheck size={15} />,
    label: "Verifikasi Store",
    requiredModule: "core.settings",
    requirePermission: "canVerifyStores",
    section: "admin",
  },
];

export const CHATBOT_NAV: NavigationItem[] = [
  {
    id: "chatbot-overview",
    to: "/chatbot",
    icon: <Bot size={15} />,
    label: "Bot Overview",
    requiredModule: "core.dashboard",
    end: true,
    section: "chatbot",
  },
  {
    id: "chatbot-chats",
    to: "/chatbot/chats",
    icon: <MessageSquare size={15} />,
    label: "Chat History",
    requiredModule: "core.dashboard",
    section: "chatbot",
  },
  {
    id: "chatbot-live",
    to: "/chatbot/live",
    icon: <Radio size={15} />,
    label: "Live Feed",
    requiredModule: "core.dashboard",
    section: "chatbot",
  },
  {
    id: "chatbot-llm",
    to: "/chatbot/llm",
    icon: <Wrench size={15} />,
    label: "LLM Console",
    requiredModule: "core.dashboard",
    section: "chatbot",
  },
  {
    id: "chatbot-settings",
    to: "/chatbot/settings",
    icon: <Settings size={15} />,
    label: "Bot Settings",
    requiredModule: "core.dashboard",
    section: "chatbot",
  },
];
