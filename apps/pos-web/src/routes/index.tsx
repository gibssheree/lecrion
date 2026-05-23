import { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthGuard from "../app/guards/AuthGuard";
import RegisterGuard from "../app/guards/RegisterGuard";
import ModuleGuard from "../app/guards/ModuleGuard";
import PermissionGuard from "../app/guards/PermissionGuard";
import type { PermissionKey } from "../hooks/usePermissions";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import PosDashboardPage from "../pages/PosDashboardPage";
import PosPage from "../pages/PosPage";
import OrdersPage from "../pages/OrdersPage";
import InventoryPage from "../pages/InventoryPage";
import ProductsPage from "../pages/ProductsPage";
import CategoriesPage from "../pages/CategoriesPage";
import SuppliersPage from "../pages/SuppliersPage";
import OperationsPage from "../pages/OperationsPage";
import UsersPage from "../pages/UsersPage";
import CashflowPage from "../pages/CashflowPage";
import ReportsPage from "../pages/ReportsPage";
import InvoicesPage from "../pages/InvoicesPage";
import SettingsPage from "../pages/SettingsPage";
import KdsPage from "../pages/KdsPage";
import ChatbotOverviewPage from "../pages/chatbot/ChatbotOverviewPage";
import ChatbotChatPage from "../pages/chatbot/ChatbotChatPage";
import ChatbotLiveFeedPage from "../pages/chatbot/ChatbotLiveFeedPage";
import ChatbotLlmConsolePage from "../pages/chatbot/ChatbotLlmConsolePage";
import ChatbotSettingsPage from "../pages/chatbot/ChatbotSettingsPage";
import SupportStoresPage from "../pages/SupportStoresPage";

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
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <PosDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute requiredModule="core.sales">
        <OrdersPage />
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
        <ProductsPage />
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
        <CategoriesPage />
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
        <InventoryPage />
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
        <OperationsPage />
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
        <SuppliersPage />
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
        <UsersPage />
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
        <InvoicesPage />
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
        <CashflowPage />
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
        <ReportsPage />
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
        <SettingsPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/chatbot",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <ChatbotOverviewPage />
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
        <ChatbotChatPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/live",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <ChatbotLiveFeedPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/llm",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <ChatbotLlmConsolePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chatbot/settings",
    element: (
      <ProtectedRoute requiredModule="core.dashboard">
        <ChatbotSettingsPage />
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
        <SupportStoresPage />
      </ProtectedRoute>
    ),
  },

  // POS Kasir — requires active register session
  {
    path: "/kasir",
    element: (
      <ProtectedRoute requiredModule="core.pos">
        <RegisterGuard>
          <PosPage />
        </RegisterGuard>
      </ProtectedRoute>
    ),
  },

  // KDS — Kitchen Display System (F&B)
  {
    path: "/kds",
    element: (
      <ProtectedRoute requiredModule="fnb.kds">
        <KdsPage />
      </ProtectedRoute>
    ),
  },

  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
