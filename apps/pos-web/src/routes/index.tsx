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
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const KdsPage = lazy(() => import("../pages/KdsPage"));
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
            requiredModule="core.payments"
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
