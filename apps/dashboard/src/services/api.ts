// apps/dashboard/src/services/api.ts
// Typed API client for dashboard data fetching.
//
// Auth model:
//   - Service-to-service: X-Api-Key header (VITE_DASHBOARD_API_KEY)
//   - Store context:      X-Store-Id header (VITE_DEFAULT_STORE_ID)
//   - Human login:        stores JWT in sessionStorage, sends as Bearer token
//
// In dev, Vite proxies /api → http://localhost:3000 so BASE stays empty.
// In production, set VITE_API_BASE to the full API origin.

const BASE = import.meta.env.VITE_API_BASE ?? "";
const API_KEY = import.meta.env.VITE_DASHBOARD_API_KEY ?? "";
const STORE_ID = import.meta.env.VITE_DEFAULT_STORE_ID ?? "default-store";

/** Storage key for the human JWT (set after login). */
const JWT_KEY = "lecrion_access_token";

export function getStoredToken(): string | null {
  return sessionStorage.getItem(JWT_KEY);
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem(JWT_KEY, token);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(JWT_KEY);
}

/**
 * Build the auth headers for every request.
 *
 * Priority:
 *   1. If a human JWT is stored (after login), send it as Bearer.
 *   2. Otherwise fall back to the service API key.
 *
 * This means the dashboard works in two modes:
 *   - Unauthenticated dev / service mode: API key only
 *   - Logged-in operator mode: JWT (higher privilege, store-scoped)
 */
function authHeaders(): Record<string, string> {
  const jwt = getStoredToken();
  const headers: Record<string, string> = {
    "X-Store-Id": STORE_ID,
  };

  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  } else if (API_KEY) {
    headers["X-Api-Key"] = API_KEY;
  }

  return headers;
}

async function request<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers as Record<string, string>),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginPayload {
  email: string;
  password: string;
  storeId?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; storeId: string };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setStoredToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  clearStoredToken();
}

export const getMe = () =>
  request<{ actor: string; email: string; role: string; storeId: string }>(
    "/api/auth/me",
  );

// ── Chat history ──────────────────────────────────────────────
export const getHistory = (limit = 50) =>
  request<{ history: any[] }>(`/api/chatbot/history?limit=${limit}`);
export const clearHistory = (sender: string) =>
  request(`/api/chatbot/history/${encodeURIComponent(sender)}`, {
    method: "DELETE",
  });

// ── Orders ────────────────────────────────────────────────────
export const getOrders = async (status = "all", limit = 50) => {
  const raw = await request<any[]>(
    `/api/orders?status=${status}&limit=${limit}`,
  );
  return { orders: Array.isArray(raw) ? raw : [] };
};
export const updateOrderStatus = (id: number, status: string) =>
  request(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ── Products / catalog ────────────────────────────────────────
export const getProducts = () => request<{ products: any[] }>("/api/products");
export const updateProductStock = (id: number, stock: number) =>
  request(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });

// ── Reports / analytics ───────────────────────────────────────
// GET /api/reports/projections returns Record<string, ProjectionResult> directly.
// Wrapped in { snapshots } here so callers use a consistent shape.
export const getReportSnapshots = async () => {
  const raw = await request<Record<string, any>>("/api/reports/projections");
  return { snapshots: raw ?? {} };
};
export const rebuildReports = () =>
  request("/api/reports/projections-rebuild-all", { method: "GET" });

// ── Cashflow ──────────────────────────────────────────────────
// GET /api/cashflow/sessions/active returns the session row directly (or null).
// Wrapped in { session } here so callers use a consistent shape.
export const getActiveSession = async (storeId = STORE_ID) => {
  const raw = await request<any>(
    `/api/cashflow/sessions/active?storeId=${storeId}`,
  );
  // API returns the session row directly (Prisma findFirst result)
  return { session: raw ?? null };
};
export const openSession = (data: Record<string, unknown>) =>
  request("/api/cashflow/sessions/open", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const closeSession = (id: number, data: Record<string, unknown>) =>
  request(`/api/cashflow/sessions/close`, {
    method: "POST",
    body: JSON.stringify({ sessionId: id, ...data }),
  });
// GET /api/cashflow/sessions/:id/entries returns a raw array.
// Wrapped in { entries } here for consistent shape.
export const getSessionEntries = async (id: number) => {
  const raw = await request<any[]>(`/api/cashflow/sessions/${id}/entries`);
  return { entries: Array.isArray(raw) ? raw : [] };
};

// ── Settings ──────────────────────────────────────────────────
export const getSettings = () =>
  request<Record<string, string>>("/api/stores/settings");
export const saveSettings = (data: Record<string, string>) =>
  request("/api/stores/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Audit logs ────────────────────────────────────────────────
export const getAuditLogs = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request<{ logs: any[] }>(`/api/audit${qs ? "?" + qs : ""}`);
};

// ── LLM test console ──────────────────────────────────────────
export const llmChat = (message: string, role = "admin") =>
  request<{ reply: string }>("/api/llm/chat", {
    method: "POST",
    body: JSON.stringify({ message, role, sender: "dashboard-console" }),
  });
export const getLlmTools = () => request<{ tools: any[] }>("/api/llm/tools");

// ── Health ────────────────────────────────────────────────────
export const getHealth = () =>
  request<{ status: string; uptime: number; checks: Record<string, any> }>(
    "/api/health",
  );
