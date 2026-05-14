// apps/pos-web/src/services/api.ts
// Typed API client for POS Web — all requests proxy to localhost:3000

const BASE = "";

async function request<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem("pos_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers as Record<string, string>),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

// ── Auth ──────────────────────────────────────────────
export const login = (email: string, password: string) =>
  request<{ accessToken: string; user: any }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const getMe = () => request<any>("/api/auth/me");

// ── Products / catalog ────────────────────────────────
export const getProducts = (q?: string) =>
  request<{ products: any[] }>(
    `/api/products${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );

export const updateProductStock = (id: number, stock: number) =>
  request(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });

export const getLowStock = () => request<any[]>("/api/inventory/low-stock");
export const getOutOfStock = () =>
  request<any[]>("/api/inventory/out-of-stock");

// ── Register ──────────────────────────────────────────
export const getActiveRegister = async () => {
  // Backend returns the session object directly (or null), not { session: ... }
  const raw = await request<any>("/api/register/active");
  return { session: raw ?? null };
};

export const openRegister = (data: {
  cashierId: string;
  openingCash: number;
  notes?: string;
}) =>
  request("/api/register/open", { method: "POST", body: JSON.stringify(data) });

export const closeRegister = (data: {
  sessionId: number;
  countedCash: number;
  operatorId: string;
  notes?: string;
}) =>
  request("/api/register/close", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const suspendRegister = (id: number) =>
  request(`/api/register/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const resumeRegister = (id: number) =>
  request(`/api/register/${id}/resume`, {
    method: "POST",
    body: JSON.stringify({}),
  });

// ── Checkout ──────────────────────────────────────────
export const posCheckout = (data: {
  items: Array<{ productId: number; name: string; price: number; qty: number }>;
  paymentMethod: string;
  cashierId: string;
  storeId?: string;
  customerName?: string;
  note?: string;
}) =>
  request<{ orderId: number; total: number }>("/api/pos/checkout", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Payments ──────────────────────────────────────────
export const recordPayment = (data: {
  orderId: number;
  amount: number;
  paymentMethod: string;
}) =>
  request<{ paymentId: number }>("/api/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const confirmPayment = (data: {
  paymentId: number;
  paidAmount: number;
}) =>
  request("/api/payments/confirm", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Reports ───────────────────────────────────────────
export const getReportSnapshots = async () => {
  const raw = await request<Record<string, any>>("/api/reports/projections");
  return { snapshots: raw ?? {} };
};

// ── Settings ──────────────────────────────────────────
export const getSettings = () =>
  request<Record<string, string>>("/api/stores/settings");

export const saveSettings = (data: Record<string, string>) =>
  request("/api/stores/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Cashflow / Sessions ───────────────────────────────
export const getActiveSession = async (storeId = "default-store") => {
  const raw = await request<any>(
    `/api/cashflow/sessions/active?storeId=${storeId}`,
  );
  return { session: raw ?? null };
};

export const openSession = (data: Record<string, unknown>) =>
  request("/api/cashflow/sessions/open", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const closeSession = (_id: number, data: Record<string, unknown>) =>
  request("/api/cashflow/sessions/close", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getSessionEntries = async (id: number) => {
  const raw = await request<any[]>(`/api/cashflow/sessions/${id}/entries`);
  return { entries: Array.isArray(raw) ? raw : [] };
};

// ── Orders ────────────────────────────────────────────
export const getOrders = async (status = "all", limit = 20) => {
  // Backend returns a raw array, not { orders: [...] }
  const raw = await request<any[]>(
    `/api/orders?status=${status}&limit=${limit}`,
  );
  return { orders: Array.isArray(raw) ? raw : [] };
};

export const getOrderById = (id: number) => request<any>(`/api/orders/${id}`);

export const updateOrderStatus = (id: number, status: string) =>
  request(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
