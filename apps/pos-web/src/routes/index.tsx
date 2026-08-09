import { lazy, ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthGuard from "../app/guards/AuthGuard";
import RegisterGuard from "../app/guards/RegisterGuard";
import ModuleGuard from "../app/guards/ModuleGuard";
import PermissionGuard from "../app/guards/PermissionGuard";
import { PageTitleProvider } from "../app/PageTitleContext";
import PosLayout from "../components/layout/PosLayout";
import type { PermissionKey } from "../hooks/usePermissions";

// Auth pages — eager: loaded immediately so login isn't behind a waterfall
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

// All other pages — lazy: each becomes its own JS chunk, loaded on demand
const PosDashboardPage = lazy(() => import("../pages/PosDashboardPage"));
const LandingPage = lazy(() => import("../pages/LandingPage"));
const PosPage = lazy(() => import("../pages/PosPage"));
const OrdersPage = lazy(() => import("../pages/OrdersPage"));
const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const ProductsPage = lazy(() => import("../pages/ProductsPage"));
const CategoriesPage = lazy(() => import("../pages/CategoriesPage"));
const SuppliersPage = lazy(() => import("../pages/SuppliersPage"));
const OperationsPage = lazy(() => import("../pages/OperationsPage"));
const CashflowPage = lazy(() => import("../pages/CashflowPage"));
const ReportsPage = lazy(() => import("../pages/ReportsPage"));
const InvoicesPage = lazy(() => import("../pages/InvoicesPage"));
const VerticalFeaturePage = lazy(() => import("../pages/VerticalFeaturePage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const KdsPage = lazy(() => import("../pages/KdsPage"));

// Phase 12 — vertical-specific pages (real implementations, replace placeholders)
const TablesPage = lazy(() => import("../pages/TablesPage"));
const ReturnsPage = lazy(() => import("../pages/ReturnsPage"));
const ProductVariantsPage = lazy(() => import("../pages/ProductVariantsPage"));
const ProductBarcodesPage = lazy(() => import("../pages/ProductBarcodesPage"));
const InventoryLocationsPage = lazy(
  () => import("../pages/InventoryLocationsPage"),
);
const InventoryMovementsPage = lazy(
  () => import("../pages/InventoryMovementsPage"),
);
const StockTransfersPage = lazy(() => import("../pages/StockTransfersPage"));
const ModifiersPage = lazy(() => import("../pages/ModifiersPage"));
const RecipesPage = lazy(() => import("../pages/RecipesPage"));
const StockOpnamePage = lazy(() => import("../pages/StockOpnamePage"));
const ReportProductsPage = lazy(() => import("../pages/ReportProductsPage"));
const ReportInventoryPage = lazy(() => import("../pages/ReportInventoryPage"));
const RawIngredientsPage = lazy(() => import("../pages/RawIngredientsPage"));
const SupportStoresPage = lazy(() => import("../pages/SupportStoresPage"));
const SupportDashboardPage = lazy(
  () => import("../pages/support/SupportDashboardPage"),
);
const SupportMerchantsPage = lazy(
  () => import("../pages/support/SupportMerchantsPage"),
);
const SupportMerchantDetailPage = lazy(
  () => import("../pages/support/SupportMerchantDetailPage"),
);
const SupportVerificationPage = lazy(
  () => import("../pages/support/SupportVerificationPage"),
);
const SupportLlmPlatformPage = lazy(
  () => import("../pages/support/SupportLlmPlatformPage"),
);
const SupportAuditPage = lazy(
  () => import("../pages/support/SupportAuditPage"),
);
const SupportHealthPage = lazy(
  () => import("../pages/support/SupportHealthPage"),
);
const ChatbotOverviewPage = lazy(
  () => import("../pages/chatbot/ChatbotOverviewPage"),
);
const ChatbotChatPage = lazy(() => import("../pages/chatbot/ChatbotChatPage"));
const ChatbotLiveFeedPage = lazy(
  () => import("../pages/chatbot/ChatbotLiveFeedPage"),
);
const ChatbotLlmConsolePage = lazy(
  () => import("../pages/chatbot/ChatbotLlmConsolePage"),
);
const ChatbotSettingsPage = lazy(
  () => import("../pages/chatbot/ChatbotSettingsPage"),
);
const OrderDetailPage = lazy(() => import("../pages/OrderDetailPage"));
const ProductDetailPage = lazy(() => import("../pages/ProductDetailPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const PrivacyPolicyPage = lazy(() => import("../pages/legal/PrivacyPolicyPage"));
const TermsPage = lazy(() => import("../pages/legal/TermsPage"));

/** Thin fallback shown while a lazy chunk is downloading. */
function PageFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 240,
      }}
    >
      <div className="spinner" style={{ width: 22, height: 22 }} />
    </div>
  );
}

/** Wraps a lazy page in Suspense so each route gets its own fallback. */
function S({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

const Auth = ({ children }: { children: ReactNode }) => (
  <AuthGuard>{children}</AuthGuard>
);

interface ProtectedRouteProps {
  requiredModule: string;
  requiredPermission?: PermissionKey;
  children: ReactNode;
}

const Protected = ({
  requiredModule,
  requiredPermission,
  children,
}: ProtectedRouteProps) => (
  <Auth>
    <ModuleGuard requiredModule={requiredModule}>
      {requiredPermission ? (
        <PermissionGuard permission={requiredPermission}>
          {children}
        </PermissionGuard>
      ) : (
        children
      )}
    </ModuleGuard>
  </Auth>
);

function VerticalFeature(props: {
  title: string;
  domain: "sales" | "products" | "inventory" | "reports";
  description: string;
  checkpoints: string[];
}) {
  return (
    <S>
      <VerticalFeaturePage {...props} />
    </S>
  );
}

/**
 * Layout route — wraps the entire authenticated app.
 * PosLayout is mounted ONCE; only its <Outlet /> swaps between pages.
 * That eliminates the flicker that came from each page re-rendering the shell.
 */
const AppShell = () => (
  <PageTitleProvider>
    <PosLayout />
  </PageTitleProvider>
);

export const router = createBrowserRouter([
  // Public / auth routes — no shell
  {
    path: "/",
    element: (
      <S>
        <LandingPage />
      </S>
    ),
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/kebijakan-privasi",
    element: (
      <S>
        <PrivacyPolicyPage />
      </S>
    ),
  },
  {
    path: "/syarat-ketentuan",
    element: (
      <S>
        <TermsPage />
      </S>
    ),
  },

  // POS Kasir — full-screen, no shell
  {
    path: "/kasir",
    element: (
      <Protected requiredModule="core.pos">
        <RegisterGuard>
          <S>
            <PosPage />
          </S>
        </RegisterGuard>
      </Protected>
    ),
  },

  // KDS — full-screen, no shell
  {
    path: "/kds",
    element: (
      <Protected requiredModule="fnb.kds">
        <S>
          <KdsPage />
        </S>
      </Protected>
    ),
  },

  // All shell-wrapped pages share PosLayout (mounted once)
  {
    element: <AppShell />,
    children: [
      {
        path: "/dashboard",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <PosDashboardPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/orders",
        element: (
          <Protected requiredModule="core.sales">
            <S>
              <OrdersPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/orders/:id",
        element: (
          <Protected requiredModule="core.sales">
            <S>
              <OrderDetailPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/sales/tables",
        element: (
          <Protected requiredModule="fnb.tables">
            <S>
              <TablesPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/sales/reservations",
        element: (
          <Protected requiredModule="accommodation.reservations">
            <VerticalFeature
              title="Reservasi"
              domain="sales"
              description="Ruang kerja reservasi kamar untuk akomodasi, dari booking awal sampai kesiapan check-in."
              checkpoints={[
                "Kalender reservasi",
                "Data tamu dan durasi menginap",
                "Status booking dan pembayaran awal",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/sales/checkins",
        element: (
          <Protected requiredModule="accommodation.checkin">
            <VerticalFeature
              title="Check-in / Check-out"
              domain="sales"
              description="Alur operasional tamu masuk, tamu keluar, deposit, dan final invoice hotel."
              checkpoints={[
                "Daftar tamu hari ini",
                "Deposit dan charge tambahan",
                "Finalisasi check-out",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/sales/delivery-schedule",
        element: (
          <Protected requiredModule="construction.delivery_schedule">
            <VerticalFeature
              title="Jadwal Pengiriman"
              domain="sales"
              description="Jadwal kirim material proyek, armada, alamat tujuan, dan status pemenuhan pesanan."
              checkpoints={[
                "Tanggal dan slot pengiriman",
                "Alamat proyek dan penerima",
                "Status loading, dikirim, selesai",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/returns",
        element: (
          <Protected requiredModule="retail.exchanges">
            <S>
              <ReturnsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageProducts"
          >
            <S>
              <ProductsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/:id",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageProducts"
          >
            <S>
              <ProductDetailPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/categories",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageProducts"
          >
            <S>
              <CategoriesPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/modifiers",
        element: (
          <Protected
            requiredModule="fnb.modifiers"
            requiredPermission="canManageProducts"
          >
            <S>
              <ModifiersPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/recipes",
        element: (
          <Protected
            requiredModule="fnb.recipes"
            requiredPermission="canManageProducts"
          >
            <S>
              <RecipesPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/variants",
        element: (
          <Protected
            requiredModule="retail.variants"
            requiredPermission="canManageProducts"
          >
            <S>
              <ProductVariantsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/barcodes",
        element: (
          <Protected
            requiredModule="retail.barcode"
            requiredPermission="canManageProducts"
          >
            <S>
              <ProductBarcodesPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/products/rooms",
        element: (
          <Protected
            requiredModule="accommodation.rooms"
            requiredPermission="canManageProducts"
          >
            <VerticalFeature
              title="Tipe Kamar"
              domain="products"
              description="Kelola tipe kamar, kapasitas, harga dasar, dan inventori kamar yang bisa dipesan."
              checkpoints={[
                "Tipe dan kapasitas kamar",
                "Harga dasar per malam",
                "Fasilitas kamar",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/products/services",
        element: (
          <Protected
            requiredModule="accommodation.guest_services"
            requiredPermission="canManageProducts"
          >
            <VerticalFeature
              title="Layanan Tambahan"
              domain="products"
              description="Kelola layanan hotel seperti laundry, extra bed, breakfast, dan add-on tamu."
              checkpoints={[
                "Katalog layanan tamu",
                "Harga layanan",
                "Posting ke invoice tamu",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/products/stay-packages",
        element: (
          <Protected
            requiredModule="accommodation.reservations"
            requiredPermission="canManageProducts"
          >
            <VerticalFeature
              title="Paket Menginap"
              domain="products"
              description="Rangkai kamar, layanan, promo, dan aturan masa menginap sebagai paket jual."
              checkpoints={[
                "Komposisi paket",
                "Periode berlaku",
                "Harga paket dan deposit",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/products/unit-conversion",
        element: (
          <Protected
            requiredModule="construction.unit_conversion"
            requiredPermission="canManageProducts"
          >
            <VerticalFeature
              title="Satuan & Konversi"
              domain="products"
              description="Atur konversi satuan material seperti sak, dus, batang, meter, kilogram, dan kubik."
              checkpoints={[
                "Satuan dasar dan satuan jual",
                "Rasio konversi",
                "Pembulatan dan toleransi",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/products/project-pricing",
        element: (
          <Protected
            requiredModule="construction.project_reference"
            requiredPermission="canManageProducts"
          >
            <VerticalFeature
              title="Harga Proyek"
              domain="products"
              description="Kelola harga khusus untuk proyek, pelanggan kontraktor, atau volume pembelian material."
              checkpoints={[
                "Referensi proyek",
                "Harga kontrak",
                "Volume dan masa berlaku",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/inventory",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageInventory"
          >
            <S>
              <InventoryPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/inventory/raw-ingredients",
        element: (
          <Protected
            requiredModule="fnb.raw_ingredients"
            requiredPermission="canManageInventory"
          >
            <S>
              <RawIngredientsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/inventory/amenities",
        element: (
          <Protected
            requiredModule="accommodation.amenities_inventory"
            requiredPermission="canManageInventory"
          >
            <VerticalFeature
              title="Amenities / Consumables"
              domain="inventory"
              description="Kelola stok amenities hotel seperti toiletries, linen consumables, welcome drink, dan barang kamar."
              checkpoints={[
                "Barang konsumsi per kamar",
                "Minimum stok housekeeping",
                "Pemakaian per check-in",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/inventory/locations",
        element: (
          <Protected
            requiredModule="warehouse.locations"
            requiredPermission="canManageInventory"
          >
            <S>
              <InventoryLocationsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/inventory/movements",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageInventory"
          >
            <S>
              <InventoryMovementsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/inventory/stock-opname",
        element: (
          <Protected
            requiredModule="retail.stock_opname"
            requiredPermission="canManageInventory"
          >
            <S>
              <StockOpnamePage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/inventory/transfers",
        element: (
          <Protected
            requiredModule="warehouse.transfer"
            requiredPermission="canManageInventory"
          >
            <S>
              <StockTransfersPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/operations",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageInventory"
          >
            <S>
              <OperationsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/operations/purchase-orders",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageInventory"
          >
            <S>
              <OperationsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/operations/goods-receipts",
        element: (
          <Protected
            requiredModule="core.inventory"
            requiredPermission="canManageInventory"
          >
            <S>
              <OperationsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/suppliers",
        element: (
          <Protected
            requiredModule="core.suppliers"
            requiredPermission="canManageInventory"
          >
            <S>
              <SuppliersPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/users",
        element: <Navigate to="/settings" replace />,
      },
      {
        path: "/invoices",
        element: (
          <Protected
            requiredModule="core.invoices"
            requiredPermission="canViewCashflow"
          >
            <S>
              <InvoicesPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/cashflow",
        element: (
          <Protected
            requiredModule="core.payments"
            requiredPermission="canViewCashflow"
          >
            <S>
              <CashflowPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports",
        element: (
          <Protected
            requiredModule="core.reports"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports/sales",
        element: (
          <Protected
            requiredModule="core.reports"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports/products",
        element: (
          <Protected
            requiredModule="core.reports"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportProductsPage flavor="products" />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports/inventory",
        element: (
          <Protected
            requiredModule="core.reports"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportInventoryPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports/menu",
        element: (
          <Protected
            requiredModule="fnb.recipes"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportProductsPage flavor="menu" />
            </S>
          </Protected>
        ),
      },
      {
        path: "/reports/reservations",
        element: (
          <Protected
            requiredModule="accommodation.reservations"
            requiredPermission="canViewAllReports"
          >
            <VerticalFeature
              title="Laporan Reservasi"
              domain="reports"
              description="Analisis okupansi, reservasi masuk, pembatalan, dan performa tipe kamar."
              checkpoints={[
                "Okupansi per periode",
                "Booking source",
                "Pembatalan dan no-show",
              ]}
            />
          </Protected>
        ),
      },
      {
        path: "/reports/revenue",
        element: (
          <Protected
            requiredModule="core.reports"
            requiredPermission="canViewAllReports"
          >
            <S>
              <ReportsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/settings",
        element: <Navigate to="/settings/toko" replace />,
      },
      {
        path: "/settings/:section",
        element: (
          <Protected
            requiredModule="core.settings"
            requiredPermission="canChangeSettings"
          >
            <S>
              <SettingsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/chatbot",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <ChatbotOverviewPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/chatbot/dashboard",
        element: <Navigate to="/chatbot" replace />,
      },
      {
        path: "/chatbot/chats",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <ChatbotChatPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/chatbot/live",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <ChatbotLiveFeedPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/chatbot/llm",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <ChatbotLlmConsolePage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/chatbot/settings",
        element: (
          <Protected requiredModule="core.dashboard">
            <S>
              <ChatbotSettingsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canManageAllStores"
          >
            <S>
              <SupportDashboardPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/merchants",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canManageAllStores"
          >
            <S>
              <SupportMerchantsPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/merchants/:storeId",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canManageAllStores"
          >
            <S>
              <SupportMerchantDetailPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/verifikasi",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canVerifyStores"
          >
            <S>
              <SupportVerificationPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/llm",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canConfigureLlmPlatform"
          >
            <S>
              <SupportLlmPlatformPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/audit",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canViewAuditLogs"
          >
            <S>
              <SupportAuditPage />
            </S>
          </Protected>
        ),
      },
      {
        path: "/support/health",
        element: (
          <Protected
            requiredModule="core.dashboard"
            requiredPermission="canViewSystemHealth"
          >
            <S>
              <SupportHealthPage />
            </S>
          </Protected>
        ),
      },
      // Legacy alias — old verification page redirect target
      {
        path: "/support/stores",
        element: <Navigate to="/support/merchants" replace />,
      },
      {
        path: "/support/legacy-stores",
        element: (
          <Protected
            requiredModule="core.settings"
            requiredPermission="canVerifyStores"
          >
            <S>
              <SupportStoresPage />
            </S>
          </Protected>
        ),
      },

      // 404 — last in shell-wrapped group
      {
        path: "*",
        element: (
          <Auth>
            <S>
              <NotFoundPage />
            </S>
          </Auth>
        ),
      },
    ],
  },
]);
