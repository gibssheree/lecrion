import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthGuard from "../app/guards/AuthGuard";
import RegisterGuard from "../app/guards/RegisterGuard";
import LoginPage from "../pages/LoginPage";
import PosDashboardPage from "../pages/PosDashboardPage";
import PosPage from "../pages/PosPage";
import OrdersPage from "../pages/OrdersPage";
import InventoryPage from "../pages/InventoryPage";
import CashflowPage from "../pages/CashflowPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";

const Auth = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard>{children}</AuthGuard>
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/dashboard",
    element: (
      <Auth>
        <PosDashboardPage />
      </Auth>
    ),
  },
  {
    path: "/orders",
    element: (
      <Auth>
        <OrdersPage />
      </Auth>
    ),
  },
  {
    path: "/inventory",
    element: (
      <Auth>
        <InventoryPage />
      </Auth>
    ),
  },
  {
    path: "/cashflow",
    element: (
      <Auth>
        <CashflowPage />
      </Auth>
    ),
  },
  {
    path: "/reports",
    element: (
      <Auth>
        <ReportsPage />
      </Auth>
    ),
  },
  {
    path: "/settings",
    element: (
      <Auth>
        <SettingsPage />
      </Auth>
    ),
  },

  // POS Kasir — requires active register session
  {
    path: "/kasir",
    element: (
      <Auth>
        <RegisterGuard>
          <PosPage />
        </RegisterGuard>
      </Auth>
    ),
  },

  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
