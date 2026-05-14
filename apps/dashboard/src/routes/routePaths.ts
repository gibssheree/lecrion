/**
 * routePaths.ts — canonical route path constants.
 * Import ROUTES everywhere instead of hardcoding strings.
 */
export const ROUTES = {
  ROOT: "/",
  BOT_OVERVIEW: "/",
  CHAT: "/chat",
  LIVE: "/live",
  ORDERS: "/orders",
  INVENTORY: "/inventory",
  CASHFLOW: "/cashflow",
  LLM: "/llm",
  SETTINGS: "/settings",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Page title map — used by DashboardShell header */
export const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.BOT_OVERVIEW]: "Bot Overview",
  [ROUTES.CHAT]: "Chat History",
  [ROUTES.LIVE]: "Live Feed — Realtime",
  [ROUTES.ORDERS]: "Monitor Pesanan",
  [ROUTES.INVENTORY]: "Stok Barang",
  [ROUTES.CASHFLOW]: "Cashflow",
  [ROUTES.LLM]: "LLM Console",
  [ROUTES.SETTINGS]: "Pengaturan",
};
