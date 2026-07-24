import { ReactNode } from "react";
import {
  BarChart2,
  Bot,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
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
  UtensilsCrossed,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { PermissionKey } from "../hooks/usePermissions";

export type BusinessPresetKey =
  | "restaurant"
  | "cafe"
  | "retail_store"
  | "accommodation"
  | "building_materials";

export interface NavigationItem {
  id: string;
  to: string;
  icon?: ReactNode;
  label: string;
  requiredModule: string;
  end?: boolean;
  requirePermission?: PermissionKey;
  section: "core" | "operations" | "vertical" | "admin" | "chatbot" | "support";
  hideForSupport?: boolean;
  presets?: BusinessPresetKey[];
  excludePresets?: BusinessPresetKey[];
}

export interface NavigationGroup {
  id: string;
  icon: ReactNode;
  label: string;
  section: "core" | "operations" | "vertical" | "admin" | "chatbot" | "support";
  hideForSupport?: boolean;
  children: NavigationItem[];
}

export type NavigationNode = NavigationItem | NavigationGroup;

export function isNavigationGroup(node: NavigationNode): node is NavigationGroup {
  return "children" in node;
}

export function flattenNavigation(nodes: NavigationNode[]): NavigationItem[] {
  return nodes.flatMap((node) =>
    isNavigationGroup(node)
      ? node.children.map((item) => ({ ...item, icon: item.icon ?? node.icon }))
      : [node],
  );
}

const restaurantPresets: BusinessPresetKey[] = ["restaurant", "cafe"];
const sellWithCashierPresets: BusinessPresetKey[] = [
  "restaurant",
  "cafe",
  "retail_store",
  "building_materials",
];
const productListPresets: BusinessPresetKey[] = [
  "retail_store",
  "building_materials",
];

export const MAIN_NAV: NavigationNode[] = [
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
    id: "sales",
    icon: <ShoppingCart size={17} />,
    label: "Penjualan",
    section: "core",
    hideForSupport: true,
    children: [
      {
        id: "sales-pos",
        to: "/kasir",
        label: "Kasir",
        requiredModule: "core.pos",
        section: "core",
        presets: sellWithCashierPresets,
        hideForSupport: true,
      },
      {
        id: "sales-reservations",
        to: "/sales/reservations",
        label: "Reservasi",
        requiredModule: "accommodation.reservations",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "sales-checkin",
        to: "/sales/checkins",
        label: "Check-in / Check-out",
        requiredModule: "accommodation.checkin",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "sales-orders",
        to: "/orders",
        label: "Pesanan",
        requiredModule: "core.sales",
        section: "core",
        hideForSupport: true,
      },
      {
        id: "sales-tables",
        to: "/sales/tables",
        label: "Meja",
        requiredModule: "fnb.tables",
        section: "vertical",
        presets: ["restaurant"],
        hideForSupport: true,
      },
      {
        id: "sales-kds",
        to: "/kds",
        label: "KDS / Dapur",
        requiredModule: "fnb.kds",
        section: "vertical",
        presets: ["restaurant"],
        hideForSupport: true,
      },
      {
        id: "sales-invoices",
        to: "/invoices",
        label: "Invoice",
        requiredModule: "core.invoices",
        requirePermission: "canViewCashflow",
        section: "operations",
        hideForSupport: true,
      },
      {
        id: "sales-returns",
        to: "/returns",
        label: "Retur / Refund",
        requiredModule: "retail.exchanges",
        section: "vertical",
        presets: ["retail_store"],
        hideForSupport: true,
      },
      {
        id: "sales-delivery-schedule",
        to: "/sales/delivery-schedule",
        label: "Jadwal Pengiriman",
        requiredModule: "construction.delivery_schedule",
        section: "vertical",
        presets: ["building_materials"],
        hideForSupport: true,
      },
    ],
  },
  {
    id: "products",
    icon: <Boxes size={17} />,
    label: "Produk",
    section: "core",
    hideForSupport: true,
    children: [
      {
        id: "products-menu-list",
        to: "/products",
        label: "Daftar Menu",
        requiredModule: "core.inventory",
        requirePermission: "canManageProducts",
        section: "core",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "products-list",
        to: "/products",
        label: "Daftar Produk",
        requiredModule: "core.inventory",
        requirePermission: "canManageProducts",
        section: "core",
        presets: productListPresets,
        hideForSupport: true,
      },
      {
        id: "products-rooms",
        to: "/products/rooms",
        label: "Tipe Kamar",
        requiredModule: "accommodation.rooms",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "products-menu-categories",
        to: "/categories",
        label: "Kategori Menu",
        requiredModule: "core.inventory",
        requirePermission: "canManageProducts",
        section: "core",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "products-categories",
        to: "/categories",
        label: "Kategori",
        requiredModule: "core.inventory",
        requirePermission: "canManageProducts",
        section: "core",
        presets: productListPresets,
        hideForSupport: true,
      },
      {
        id: "products-modifiers",
        to: "/products/modifiers",
        label: "Modifier",
        requiredModule: "fnb.modifiers",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "products-recipes",
        to: "/products/recipes",
        label: "Resep / BOM",
        requiredModule: "fnb.recipes",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "products-variants",
        to: "/products/variants",
        label: "Varian",
        requiredModule: "retail.variants",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["retail_store"],
        hideForSupport: true,
      },
      {
        id: "products-barcodes",
        to: "/products/barcodes",
        label: "Barcode / SKU",
        requiredModule: "retail.barcode",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["retail_store", "building_materials"],
        hideForSupport: true,
      },
      {
        id: "products-services",
        to: "/products/services",
        label: "Layanan Tambahan",
        requiredModule: "accommodation.guest_services",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "products-stay-packages",
        to: "/products/stay-packages",
        label: "Paket Menginap",
        requiredModule: "accommodation.reservations",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "products-unit-conversion",
        to: "/products/unit-conversion",
        label: "Satuan & Konversi",
        requiredModule: "construction.unit_conversion",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["building_materials"],
        hideForSupport: true,
      },
      {
        id: "products-project-pricing",
        to: "/products/project-pricing",
        label: "Harga Proyek",
        requiredModule: "construction.project_reference",
        requirePermission: "canManageProducts",
        section: "vertical",
        presets: ["building_materials"],
        hideForSupport: true,
      },
    ],
  },
  {
    id: "inventory",
    icon: <Warehouse size={17} />,
    label: "Inventori",
    section: "core",
    hideForSupport: true,
    children: [
      {
        id: "inventory-summary",
        to: "/inventory",
        label: "Ringkasan Stok",
        requiredModule: "core.inventory",
        requirePermission: "canManageInventory",
        section: "core",
        hideForSupport: true,
      },
      {
        id: "inventory-raw-ingredients",
        to: "/inventory/raw-ingredients",
        label: "Bahan Baku",
        requiredModule: "fnb.raw_ingredients",
        requirePermission: "canManageInventory",
        section: "vertical",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "inventory-amenities",
        to: "/inventory/amenities",
        label: "Amenities / Consumables",
        requiredModule: "accommodation.amenities_inventory",
        requirePermission: "canManageInventory",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "inventory-locations",
        to: "/inventory/locations",
        label: "Stok per Lokasi",
        requiredModule: "warehouse.locations",
        requirePermission: "canManageInventory",
        section: "vertical",
        presets: ["building_materials"],
        hideForSupport: true,
      },
      {
        id: "inventory-movements",
        to: "/inventory/movements",
        label: "Mutasi Stok",
        requiredModule: "core.inventory",
        requirePermission: "canManageInventory",
        section: "operations",
        hideForSupport: true,
      },
      {
        id: "inventory-stock-opname",
        to: "/inventory/stock-opname",
        label: "Stock Opname",
        requiredModule: "retail.stock_opname",
        requirePermission: "canManageInventory",
        section: "vertical",
        presets: ["retail_store"],
        hideForSupport: true,
      },
      {
        id: "inventory-transfer",
        to: "/inventory/transfers",
        label: "Transfer Stok",
        requiredModule: "warehouse.transfer",
        requirePermission: "canManageInventory",
        section: "vertical",
        presets: ["building_materials"],
        hideForSupport: true,
      },
      {
        id: "inventory-purchase-order",
        to: "/operations/purchase-orders",
        label: "Purchase Order",
        requiredModule: "core.inventory",
        requirePermission: "canManageInventory",
        section: "operations",
        hideForSupport: true,
      },
      {
        id: "inventory-goods-receipt",
        to: "/operations/goods-receipts",
        label: "Penerimaan Barang",
        requiredModule: "core.inventory",
        requirePermission: "canManageInventory",
        section: "operations",
        hideForSupport: true,
      },
      {
        id: "inventory-suppliers",
        to: "/suppliers",
        label: "Supplier",
        requiredModule: "core.suppliers",
        requirePermission: "canManageInventory",
        section: "operations",
        hideForSupport: true,
      },
    ],
  },
  {
    id: "finance",
    icon: <DollarSign size={17} />,
    label: "Keuangan",
    section: "core",
    hideForSupport: true,
    children: [
      {
        id: "finance-cashflow",
        to: "/cashflow",
        label: "Manajemen Kas",
        requiredModule: "core.payments",
        requirePermission: "canViewCashflow",
        section: "core",
        hideForSupport: true,
      },
    ],
  },
  {
    id: "reports",
    icon: <BarChart2 size={17} />,
    label: "Laporan",
    section: "core",
    hideForSupport: true,
    children: [
      {
        id: "reports-sales",
        to: "/reports/sales",
        label: "Laporan Penjualan",
        requiredModule: "core.reports",
        requirePermission: "canViewAllReports",
        section: "core",
        excludePresets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "reports-menu",
        to: "/reports/menu",
        label: "Laporan Menu",
        requiredModule: "fnb.recipes",
        requirePermission: "canViewAllReports",
        section: "vertical",
        presets: restaurantPresets,
        hideForSupport: true,
      },
      {
        id: "reports-products",
        to: "/reports/products",
        label: "Laporan Produk",
        requiredModule: "core.reports",
        requirePermission: "canViewAllReports",
        section: "core",
        presets: productListPresets,
        hideForSupport: true,
      },
      {
        id: "reports-reservations",
        to: "/reports/reservations",
        label: "Laporan Reservasi",
        requiredModule: "accommodation.reservations",
        requirePermission: "canViewAllReports",
        section: "vertical",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "reports-revenue",
        to: "/reports/revenue",
        label: "Laporan Pendapatan",
        requiredModule: "core.reports",
        requirePermission: "canViewAllReports",
        section: "core",
        presets: ["accommodation"],
        hideForSupport: true,
      },
      {
        id: "reports-inventory",
        to: "/reports/inventory",
        label: "Laporan Inventori",
        requiredModule: "core.reports",
        requirePermission: "canViewAllReports",
        section: "core",
        hideForSupport: true,
      },
    ],
  },
];

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

export const NAV_ICON_FALLBACKS = {
  invoice: <Receipt size={15} />,
  document: <FileText size={15} />,
  category: <FolderTree size={15} />,
  payment: <CreditCard size={15} />,
  kitchen: <UtensilsCrossed size={15} />,
  package: <Package size={15} />,
  supplier: <Truck size={15} />,
} as const;
