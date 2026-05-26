import { lazy, ReactNode, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthGuard from "../app/guards/AuthGuard";
import RegisterGuard from "../app/guards/RegisterGuard";
import ModuleGuard from "../app/guards/ModuleGuard";
import PermissionGuard from "../app/guards/PermissionGuard";
import type { PermissionKey } from "../hooks/usePermissions";

// Auth pages — eager: loaded immediately so login isn't behind a waterfall
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

// All other pages — lazy: each becomes its own JS chunk, loaded on demand
const PosDashboardPage    = lazy(() => import("../pages/PosDashboardPage"));
const LandingPage         = lazy(() => import("../pages/LandingPage"));
const PosPage             = lazy(() => import("../pages/PosPage"));
const OrdersPage          = lazy(() => import("../pages/OrdersPage"));
const InventoryPage       = lazy(() => import("../pages/InventoryPage"));
const ProductsPage        = lazy(() => import("../pages/ProductsPage"));
const CategoriesPage      = lazy(() => import("../pages/CategoriesPage"));
const SuppliersPage       = lazy(() => import("../pages/SuppliersPage"));
const OperationsPage      = lazy(() => import("../pages/OperationsPage"));
const UsersPage           = lazy(() => import("../pages/UsersPage"));
const CashflowPage        = lazy(() => import("../pages/CashflowPage"));
const ReportsPage         = lazy(() => import("../pages/ReportsPage"));
const InvoicesPage        = lazy(() => import("../pages/InvoicesPage"));
const SettingsPage        = lazy(() => import("../pages/SettingsPage"));
const KdsPage             = lazy(() => import("../pages/KdsPage"));
const SupportStoresPage   = lazy(() => import("../pages/SupportStoresPage"));
const ChatbotOverviewPage = lazy(() => import("../pages/chatbot/ChatbotOverviewPage"));
const ChatbotChatPage     = lazy(() => import("../pages/chatbot/ChatbotChatPage"));
const ChatbotLiveFeedPage = lazy(() => import("../pages/chatbot/ChatbotLiveFeedPage"));
const ChatbotLlmConsolePage = lazy(() => import("../pages/chatbot/ChatbotLlmConsolePage"));
const ChatbotSettingsPage = lazy(() => import("../pages/chatbot/ChatbotSettingsPage"));
const OrderDetailPage     = lazy(() => import("../pages/OrderDetailPage"));
const ProductDetailPage   = lazy(() => import("../pages/ProductDetailPage"));
const NotFoundPage        = lazy(() => import("../pages/NotFoundPage"));

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

const ProtectedRoute = ({
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

export const router = createBrowserRouter([
  { path: "/", element: <S><LandingPage /></S> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><PosDashboardPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute requiredModule="core.sales">
        <S><OrdersPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders/:id",
    element: (
      <ProtectedRoute requiredModule="core.sales">
        <S><OrderDetailPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/products",
    element: (
      <ProtectedRoute
        requiredModule="core.inventory"
        requiredPermission="canManageProducts"
      >
        <S><ProductsPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/products/:id",
    element: (
      <ProtectedRoute
        requiredModule="core.inventory"
        requiredPermission="canManageProducts"
      >
        <S><ProductDetailPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/categories",
    element: (
      <ProtectedRoute
        requiredModule="core.inventory"
        requiredPermission="canManageProducts"
      >
        <S><CategoriesPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/inventory",
    element: (
      <ProtectedRoute
        requiredModule="core.inventory"
        requiredPermission="canManageInventory"
      >
        <S><InventoryPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/operations",
    element: (
      <ProtectedRoute
        requiredModule="core.inventory"
        requiredPermission="canManageInventory"
      >
        <S><OperationsPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/suppliers",
    element: (
      <ProtectedRoute
        requiredModule="core.suppliers"
        requiredPermission="canManageInventory"
      >
        <S><SuppliersPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <ProtectedRoute
        requiredModule="core.users"
        requiredPermission="canManageUsers"
      >
        <S><UsersPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices",
    element: (
      <ProtectedRoute
        requiredModule="core.payments"
        requiredPermission="canViewCashflow"
      >
        <S><InvoicesPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/cashflow",
    element: (
      <ProtectedRoute
        requiredModule="core.payments"
        requiredPermission="canViewCashflow"
      >
        <S><CashflowPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/reports",
    element: (
      <ProtectedRoute
        requiredModule="core.reports"
        requiredPermission="canViewAllReports"
      >
        <S><ReportsPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute
        requiredModule="core.settings"
        requiredPermission="canChangeSettings"
      >
        <S><SettingsPage /></S>
      </ProtectedRoute>
    ),
  },

  {
    path: "/chatbot",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><ChatbotOverviewPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/dashboard",
    element: <Navigate to="/chatbot" replace />,
  },
  {
    path: "/chatbot/chats",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><ChatbotChatPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/live",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><ChatbotLiveFeedPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/llm",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><ChatbotLlmConsolePage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/settings",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <S><ChatbotSettingsPage /></S>
      </ProtectedRoute>
    ),
  },
  {
    path: "/support/stores",
    element: (
      <ProtectedRoute
        requiredModule="core.settings"
        requiredPermission="canVerifyStores"
      >
        <S><SupportStoresPage /></S>
      </ProtectedRoute>
    ),
  },

  // POS Kasir — requires active register session
  {
    path: "/kasir",
    element: (
      <ProtectedRoute requiredModule="core.pos">
        <RegisterGuard>
          <S><PosPage /></S>
        </RegisterGuard>
      </ProtectedRoute>
    ),
  },

  // KDS — Kitchen Display System (F&B)
  {
    path: "/kds",
    element: (
      <ProtectedRoute requiredModule="fnb.kds">
        <S><KdsPage /></S>
      </ProtectedRoute>
    ),
  },

  // 404 — must be last; AuthGuard redirects unauthenticated users to /login
  { path: "*", element: <Auth><S><NotFoundPage /></S></Auth> },
]);
