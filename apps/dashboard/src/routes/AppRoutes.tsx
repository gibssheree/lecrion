import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import NotFound from "./NotFound";
import { ROUTES } from "./routePaths";

const BotOverview = lazy(() => import("../pages/BotOverview"));
const Chat = lazy(() => import("../pages/Chat"));
const LiveFeed = lazy(() => import("../pages/LiveFeed"));
const Orders = lazy(() => import("../pages/Orders"));
const Inventory = lazy(() => import("../pages/Inventory"));
const Cashflow = lazy(() => import("../pages/Cashflow"));
const LLMConsole = lazy(() => import("../pages/LLMConsole"));
const Settings = lazy(() => import("../pages/Settings"));

/**
 * AppRoutes — the full authenticated route tree.
 * All routes share the DashboardShell layout (sidebar + header).
 * No props needed — auth state comes from the store.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<DashboardShell />}>
        <Route index element={<BotOverview />} />
        <Route path={ROUTES.CHAT} element={<Chat />} />
        <Route path={ROUTES.LIVE} element={<LiveFeed />} />
        <Route path={ROUTES.ORDERS} element={<Orders />} />
        <Route path={ROUTES.INVENTORY} element={<Inventory />} />
        <Route path={ROUTES.CASHFLOW} element={<Cashflow />} />
        <Route path={ROUTES.LLM} element={<LLMConsole />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
