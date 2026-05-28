// apps/pos-web/src/services/api.ts
// Typed API client for POS Web — all requests proxy to localhost:3000

const BASE = "";
const POS_TOKEN_KEY = "pos_token";
const DASHBOARD_TOKEN_KEY = "lecrion_access_token";
const SHARED_TOKEN_COOKIE = "lecrion_auth_token";

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function setSharedAuthToken(token: string): void {
  sessionStorage.setItem(POS_TOKEN_KEY, token);
  sessionStorage.setItem(DASHBOARD_TOKEN_KEY, token);
  document.cookie = `${SHARED_TOKEN_COOKIE}=${encodeURIComponent(
    token,
  )}; Max-Age=604800; Path=/; SameSite=Lax`;
}

export function clearSharedAuthToken(): void {
  sessionStorage.removeItem(POS_TOKEN_KEY);
  sessionStorage.removeItem(DASHBOARD_TOKEN_KEY);
  document.cookie = `${SHARED_TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function getStoredPosToken(): string | null {
  const sessionToken =
    sessionStorage.getItem(POS_TOKEN_KEY) ??
    sessionStorage.getItem(DASHBOARD_TOKEN_KEY);
  if (sessionToken) return sessionToken;

  const cookieToken = readCookie(SHARED_TOKEN_COOKIE);
  if (cookieToken) {
    sessionStorage.setItem(POS_TOKEN_KEY, cookieToken);
    sessionStorage.setItem(DASHBOARD_TOKEN_KEY, cookieToken);
    return cookieToken;
  }

  try {
    const persisted = JSON.parse(localStorage.getItem("pos-auth") ?? "{}");
    return persisted?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = getStoredPosToken();
  if (token && !sessionStorage.getItem(POS_TOKEN_KEY)) {
    setSharedAuthToken(token);
  }
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
export const login = (email: string, password: string, loginMode?: string) =>
  request<{ accessToken: string; refreshToken: string; user: any }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(loginMode ? { loginMode } : {}),
      }),
    },
  );

export const getMe = () => request<any>("/api/auth/me");

// Chatbot dashboard
export const getHistory = (limit = 50) =>
  request<{ history: any[] }>(`/api/chatbot/history?limit=${limit}`);

export const clearHistory = (sender: string) =>
  request(`/api/chatbot/history/${encodeURIComponent(sender)}`, {
    method: "DELETE",
  });

export const llmChat = (message: string, role = "admin") =>
  request<{ reply: string }>("/api/llm/chat", {
    method: "POST",
    body: JSON.stringify({ message, role, sender: "pos-web-console" }),
  });

export const getLlmTools = () => request<{ tools: any[] }>("/api/llm/tools");

export const getHealth = () =>
  request<{ status: string; uptime: number; checks: Record<string, any> }>(
    "/api/health",
  );

// ── Products / catalog ────────────────────────────────
export const getProducts = (q?: string, categoryId?: number) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoryId != null) params.set("categoryId", String(categoryId));
  const qs = params.toString();
  return request<{ products: any[] }>(`/api/products${qs ? `?${qs}` : ""}`);
};

export const getProductById = (id: number) =>
  request<{ product: any }>(`/api/products/${id}`);

export const getProductByBarcode = (barcode: string) =>
  request<{ product: any }>(
    `/api/products/barcode/${encodeURIComponent(barcode)}`,
  );

export const updateProductStock = (id: number, stock: number) =>
  request(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });

export const createProduct = (data: Record<string, unknown>) =>
  request<{ status: string; product: any }>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProduct = (id: number, data: Record<string, unknown>) =>
  request<{ status: string; product: any }>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getLowStock = () => request<any[]>("/api/inventory/low-stock");
export const getOutOfStock = () =>
  request<any[]>("/api/inventory/out-of-stock");

// ── Categories (Phase 6A) ─────────────────────────────
export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends ProductCategory {
  children: CategoryTreeNode[];
}

export const getCategories = (storeId?: string) => {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return request<{ categories: ProductCategory[] }>(`/api/categories${qs}`);
};

export const getCategoryTree = (storeId?: string) => {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return request<{ tree: CategoryTreeNode[] }>(`/api/categories/tree${qs}`);
};

export const createCategory = (data: {
  name: string;
  slug?: string;
  description?: string;
  parentId?: number | null;
  sortOrder?: number;
  storeId?: string;
}) =>
  request<{ status: string; category: ProductCategory }>("/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCategory = (
  id: number,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
    parentId: number | null;
    sortOrder: number;
    isActive: boolean;
  }>,
) =>
  request<{ status: string; category: ProductCategory }>(
    `/api/categories/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );

export const deactivateCategory = (id: number) =>
  request<{ status: string; category: ProductCategory }>(
    `/api/categories/${id}`,
    { method: "DELETE" },
  );

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== "",
  );
  if (!entries.length) return "";
  return (
    "?" +
    new URLSearchParams(
      entries.map(([key, value]) => [key, String(value)]),
    ).toString()
  );
}

// ── Owner / store management ────────────────────────────────────────────────
export interface PosUser {
  id: number;
  email: string;
  role: string;
  storeId: string;
  createdAt: string;
}

export const listUsers = () => request<PosUser[]>("/api/auth/users");

export const createUser = (data: {
  email: string;
  password: string;
  role: string;
  storeId?: string;
}) =>
  request<PosUser>("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateUserRole = (id: number, data: { role: string }) =>
  request<PosUser>(`/api/auth/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export interface Supplier {
  id: number;
  storeId: string;
  name: string;
  code: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getSuppliers = (includeInactive = true, q = "") =>
  request<Supplier[]>(
    `/api/suppliers${buildQs({
      includeInactive: includeInactive ? "true" : "false",
      q,
    })}`,
  );

export const createSupplier = (data: Record<string, unknown>) =>
  request<Supplier>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateSupplier = (id: number, data: Record<string, unknown>) =>
  request<Supplier>(`/api/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deactivateSupplier = (id: number) =>
  request<Supplier>(`/api/suppliers/${id}`, { method: "DELETE" });

export interface InventoryLocation {
  id: number;
  store_id?: string;
  storeId?: string;
  name: string;
  type?: string;
  is_active?: boolean;
  isActive?: boolean;
}

export interface OperationDocumentLine {
  id: number;
  menuId: number;
  productName: string;
  qty: number;
  unitCost: number | null;
  metadata: string | null;
}

export interface OperationDocument {
  id: number;
  documentNumber: string;
  documentType: string;
  status: string;
  storeId: string;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  supplierId: string | null;
  supplierName: string | null;
  linkedDocumentId: number | null;
  createdAt: string;
  submittedAt: string | null;
  postedAt: string | null;
  notes: string | null;
  lines: OperationDocumentLine[];
}

export const getInventoryLocations = () =>
  request<InventoryLocation[]>("/api/inventory/locations");

export const getOperationDocuments = (
  params: { documentType?: string; status?: string; limit?: number } = {},
) =>
  request<{ items?: OperationDocument[]; documents?: OperationDocument[] }>(
    `/api/operations/documents${buildQs({
      ...params,
      limit: params.limit ?? 50,
    })}`,
  );

export const createOperationDocument = (data: Record<string, unknown>) =>
  request<OperationDocument>("/api/operations/documents", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const submitOperationDocument = (id: number, operatorId = "pos-web") =>
  request<OperationDocument>(`/api/operations/documents/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ operatorId }),
  });

export const postOperationDocument = (id: number, operatorId = "pos-web") =>
  request<OperationDocument>(`/api/operations/documents/${id}/post`, {
    method: "POST",
    body: JSON.stringify({ operatorId }),
  });

export const cancelOperationDocument = (
  id: number,
  reason: string,
  operatorId = "pos-web",
) =>
  request<OperationDocument>(`/api/operations/documents/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ operatorId, reason }),
  });

// ── Register ──────────────────────────────────────────
export const getActiveRegister = async () => {
  // Backend normally returns the session object directly (or null).
  // Be defensive because older callers/adapters may return { session }.
  const raw = await request<any>("/api/register/active");
  const session = raw && "session" in raw ? raw.session : raw;
  return { session: session ?? null };
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
export interface CreatePosSaleItem {
  productId: number;
  name?: string;
  qty: number;
  unitPrice?: number;
  note?: string;
}

export interface CreatePosSalePayment {
  method: string;
  amount: number;
  paidAmount?: number;
  reference?: string;
}

export interface CreatePosSaleRequest {
  clientSaleId: string;
  registerSessionId: number;
  storeId?: string;
  cashierId: string;
  customerName?: string;
  customerPhone?: string;
  orderType: "pickup" | "dine_in" | "delivery";
  items: CreatePosSaleItem[];
  payments: CreatePosSalePayment[];
  discountAmount?: number;
  /** Required by backend when discountAmount > 0 */
  discountReason?: string;
  taxAmount?: number;
  serviceChargeAmount?: number;
  note?: string;
}

export interface PosSaleReceipt {
  saleId: string;
  orderId: number;
  receiptNumber: string;
  registerSessionId: number;
  cashierId: string;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  /** Present when a discount was applied */
  discountReason?: string;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  paidTotal: number;
  change: number;
  paymentMethods: string[];
  /** Per-line payment breakdown for split payment display */
  paymentLines: Array<{
    method: string;
    amount: number;
    paidAmount: number;
    reference?: string;
  }>;
  items: Array<{
    productId: number;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  createdAt: string;
}

export const createPosSale = (data: CreatePosSaleRequest) =>
  request<PosSaleReceipt>("/api/pos/sales", {
    method: "POST",
    body: JSON.stringify(data),
  });

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

// ── Kasir Sessions ────────────────────────────────────

export interface KasirSession {
  id: number;
  storeId: string;
  cashierId: string;
  status: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
}

export const getCurrentSession = () =>
  request<KasirSession | null>("/api/pos/sessions/current");

export const openKasirSession = (data: {
  openingCash: number;
  notes?: string;
}) =>
  request<KasirSession>("/api/pos/sessions/open", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const closeKasirSession = (
  sessionId: number,
  data: { closingCash?: number; notes?: string },
) =>
  request<KasirSession>(`/api/pos/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const listKasirSessions = (params?: {
  status?: string;
  limit?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  return request<KasirSession[]>(`/api/pos/sessions?${qs.toString()}`);
};

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
export type BusinessType =
  | "retail"
  | "restaurant"
  | "cafe"
  | "service"
  | "general";

export interface StoreInfo {
  storeId: string;
  name: string;
  tenantId: string;
  status: string;
  businessType: BusinessType;
  businessVertical?: string;
  isFnb: boolean;
}

export const getStoreInfo = () => request<StoreInfo>("/api/stores/info");

export interface StoreCapabilities {
  storeId: string;
  businessVertical: string;
  requestedBusinessVertical: string | null;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  enabledModules: string[];
  coreModules: string[];
  verticalModules: string[];
}

export const getStoreCapabilities = () =>
  request<StoreCapabilities>("/api/stores/capabilities");

export interface StoreBusinessProfile {
  storeId: string;
  requestedBusinessVertical: string | null;
  verifiedBusinessVertical: string;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const getBusinessProfile = () =>
  request<StoreBusinessProfile>("/api/stores/business-profile");

export const getAdminStoreBusinessProfile = (storeId: string) =>
  request<StoreBusinessProfile>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/business-profile`,
  );

export const getAdminStoreCapabilities = (storeId: string) =>
  request<StoreCapabilities>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/capabilities`,
  );

export const requestBusinessProfile = (
  businessVertical: string,
  notes?: string,
) =>
  request<StoreBusinessProfile>("/api/stores/business-profile/request", {
    method: "POST",
    body: JSON.stringify({ businessVertical, notes }),
  });

export const verifyStoreBusinessProfile = (
  storeId: string,
  businessVertical: string,
  notes?: string,
) =>
  request<StoreBusinessProfile>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/business-profile/verify`,
    {
      method: "PATCH",
      body: JSON.stringify({ businessVertical, notes }),
    },
  );

export const setStoreModuleOverride = (
  storeId: string,
  moduleKey: string,
  enabled: boolean,
  reason?: string,
) =>
  request<StoreCapabilities>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/modules/${encodeURIComponent(
      moduleKey,
    )}`,
    {
      method: "PATCH",
      body: JSON.stringify({ enabled, reason }),
    },
  );

// ── Support / platform admin ────────────────────────────────────────────────

export interface SupportStoreRow {
  storeId: string;
  name: string;
  businessVertical: string;
  requestedBusinessVertical: string | null;
  verificationStatus: string;
  ownerName: string | null;
  ownerPhone: string | null;
  city: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const listAdminStores = (
  filters: {
    status?: string;
    vertical?: string;
    q?: string;
    limit?: number;
  } = {},
) => {
  const qs = buildQs({
    status: filters.status,
    vertical: filters.vertical,
    q: filters.q,
    limit: filters.limit,
  });
  return request<SupportStoreRow[]>(`/api/admin/stores${qs}`);
};

export interface SupportStoreActivity {
  storeId: string;
  userCount: number;
  productCount: number;
  activeRegister: { id: number; cashierId: string; openedAt: string } | null;
  salesToday: number;
  revenueToday: number;
  lastSaleAt: string | null;
}

export const getAdminStoreActivity = (storeId: string) =>
  request<SupportStoreActivity>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/activity`,
  );

export interface SupportStoreUser {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

export const getAdminStoreUsers = (storeId: string) =>
  request<SupportStoreUser[]>(
    `/api/admin/stores/${encodeURIComponent(storeId)}/users`,
  );

export interface PendingBusinessProfile {
  storeId: string;
  requestedBusinessVertical: string | null;
  verifiedBusinessVertical: string;
  verificationStatus: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const getAdminPendingProfiles = () =>
  request<PendingBusinessProfile[]>("/api/admin/business-profiles/pending");

export interface SystemHealth {
  db: { ok: boolean; latencyMs: number };
  sync: {
    pendingOutbox: number;
    processedOutbox: number;
    failedOutbox: number;
    lastProcessedAt: string | null;
  };
  activity: {
    sessionsActive: number;
    ordersToday: number;
    stores: number;
    users: number;
  };
  timestamp: string;
}

export const getAdminSystemHealth = () =>
  request<SystemHealth>("/api/admin/system/health");

export interface AdminAuditLog {
  id: number;
  actor: string;
  action: string;
  resource: string;
  resourceId: string | null;
  tenantId: string;
  storeId: string;
  channel: string;
  correlationId: string | null;
  before: any;
  after: any;
  createdAt: string;
}

export const getAdminAuditLogs = (
  filters: {
    storeId?: string;
    actor?: string;
    resource?: string;
    action?: string;
    limit?: number;
  } = {},
) => {
  const qs = buildQs({
    storeId: filters.storeId,
    actor: filters.actor,
    resource: filters.resource,
    action: filters.action,
    limit: filters.limit,
  });
  return request<{ logs: AdminAuditLog[] }>(`/api/admin/audit-logs${qs}`);
};

export interface PlatformLlmConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompts: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const getAdminLlmConfig = () =>
  request<PlatformLlmConfig>("/api/admin/llm/config");

export const updateAdminLlmConfig = (
  patch: Partial<{
    model: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    systemPrompts: Record<string, string>;
  }>,
) =>
  request<PlatformLlmConfig>("/api/admin/llm/config", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const getSettings = () =>
  request<Record<string, string>>("/api/stores/settings");

export const saveSettings = (data: Record<string, string>) =>
  request("/api/stores/settings", {
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * GET /api/stores/calc-policy
 *
 * Returns the store's calculation policy (tax rate, service charge rate,
 * tax mode, discount max without approval).
 * Used by PaymentDrawer to display tax/service charge before checkout.
 */
export interface StoreCalcPolicy {
  taxRate: number;
  serviceChargeRate: number;
  taxMode: "exclusive" | "inclusive";
  discountMaxWithoutApproval: number;
}

export const getStoreCalcPolicy = () =>
  request<StoreCalcPolicy>("/api/stores/calc-policy");

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

// ── POS Receipt ───────────────────────────────────────
/**
 * Fetch a receipt for a completed POS sale by orderId.
 * Endpoint: GET /api/pos/sales/:orderId/receipt
 * Returns PosSaleReceipt if the backend Phase 4 endpoint exists.
 */
export const getPosSaleReceipt = (orderId: number) =>
  request<PosSaleReceipt>(`/api/pos/sales/${orderId}/receipt`);

// ── Register Session Summary (Phase 2) ───────────────────────────────────────

export interface NonCashBreakdown {
  method: string;
  total: number;
}

export interface SoldProductSummary {
  productId: number;
  name: string;
  qty: number;
  lineTotal: number;
}

export interface SessionSummary {
  sessionId: number;
  cashierId: string;
  storeId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  cashSales: number;
  nonCashSales: NonCashBreakdown[];
  nonCashSalesTotal: number;
  cashIn: number;
  cashOut: number;
  /** Always present; 0 if no refunds recorded */
  refunds: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  transactionCount: number;
  soldProducts: SoldProductSummary[];
  firstSaleTime: string | null;
  lastSaleTime: string | null;
}

export const getSessionSummary = (sessionId: number) =>
  request<SessionSummary>(`/api/register/sessions/${sessionId}/summary`);

export type CashAdjustmentType = "cash_in" | "cash_out" | "expense" | "refund";

export interface CashAdjustmentRequest {
  adjustmentType: CashAdjustmentType;
  amount: number;
  operatorId?: string;
  note?: string;
  category?: string;
}

export interface CashAdjustmentResponse {
  entryId: number;
  sessionId: number;
  adjustmentType: string;
  amount: number;
}

export const recordCashAdjustment = (
  sessionId: number,
  data: CashAdjustmentRequest,
) =>
  request<CashAdjustmentResponse>(
    `/api/register/sessions/${sessionId}/cash-adjustments`,
    { method: "POST", body: JSON.stringify(data) },
  );

// ── POS Corrections (Phase 5) ─────────────────────────────────────────────────

export interface VoidOrderRequest {
  reason: string;
  operatorId?: string;
  managerPin?: string;
  approvedBy?: string;
  managerApprovalId?: number;
}

export interface VoidOrderResponse {
  orderId: number;
  status: string;
  reason: string;
  voidedAt: string;
  correctionNumber: string;
}

export interface RefundLineRequest {
  productId: number;
  refundQty: number;
}

export interface RefundOrderRequest {
  /** Item lines to refund. If omitted, full refund of all remaining items. */
  items?: RefundLineRequest[];
  reason: string;
  operatorId?: string;
  managerPin?: string;
  approvedBy?: string;
  managerApprovalId?: number;
}

export interface RefundPaymentAllocation {
  paymentId: number;
  method: string;
  refundAmount: number;
  isCash: boolean;
  cashflowEntryId: number | null;
}

export interface RefundOrderResponse {
  orderId: number;
  /** 'refunded' or 'partially_refunded' */
  status: string;
  reason: string;
  refundedAt: string;
  correctionNumber: string;
  refundAmount: number;
  previouslyRefunded: number;
  remainingRefundable: number;
  paymentAllocations: RefundPaymentAllocation[];
  cashflowEntriesCreated: number;
  refundedLines: Array<{
    productId: number;
    name: string;
    refundQty: number;
    unitPrice: number;
    lineRefundAmount: number;
  }>;
}

export interface ReturnItemRequest {
  productId: number;
  returnQty: number;
}

export interface ReturnItemsRequest {
  items: ReturnItemRequest[];
  reason: string;
  operatorId?: string;
}

export interface ReturnedItem {
  productId: number;
  name: string;
  returnQty: number;
  stockBefore: number;
  stockAfter: number;
}

export interface ReturnItemsResponse {
  orderId: number;
  reason: string;
  returnedAt: string;
  correctionNumber: string;
  returnedItems: ReturnedItem[];
}

export const voidOrder = (orderId: number, data: VoidOrderRequest) =>
  request<VoidOrderResponse>(`/api/pos/orders/${orderId}/void`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const refundOrder = (orderId: number, data: RefundOrderRequest) =>
  request<RefundOrderResponse>(`/api/pos/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const returnItems = (orderId: number, data: ReturnItemsRequest) =>
  request<ReturnItemsResponse>(`/api/pos/orders/${orderId}/return-items`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── Manager Approval (Phase 5D) ───────────────────────────────────────────────

export interface ApprovalThresholds {
  refundApprovalThresholdIdr: number;
  discountApprovalThresholdIdr: number;
  voidMaxAgeMinutes: number;
}

export interface RequestApprovalPayload {
  approvalType: "refund" | "void" | "discount_override" | "price_override";
  requestedBy: string;
  reason: string;
}

export interface RequestApprovalResponse {
  approvalId: number;
  approvalType: string;
  status: "pending";
  requestedBy: string;
  reason: string;
  createdAt: string;
}

export interface InlineApprovalPayload {
  approvalType: "refund" | "void" | "discount_override" | "price_override";
  requestedBy: string;
  reason: string;
  managerPin: string;
  approvedBy: string;
}

export interface InlineApprovalResponse {
  approvalId: number;
  approvalType: string;
  status: "approved";
  requestedBy: string;
  approvedBy: string;
  reason: string;
  createdAt: string;
  resolvedAt: string;
}

export const getApprovalThresholds = () =>
  request<ApprovalThresholds>("/api/pos/approval/thresholds");

export const requestApproval = (data: RequestApprovalPayload) =>
  request<RequestApprovalResponse>("/api/pos/approval/request", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const inlineApprove = (data: InlineApprovalPayload) =>
  request<InlineApprovalResponse>("/api/pos/approval/inline", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── F&B Tables (Phase 6D) ─────────────────────────────────────────────────────

export const getFnbTables = (storeId?: string, available?: boolean) => {
  const params = new URLSearchParams();
  if (storeId) params.set("storeId", storeId);
  if (available) params.set("available", "true");
  const qs = params.toString();
  return request<any[]>(`/api/fnb/tables${qs ? `?${qs}` : ""}`);
};

export const getFnbAreas = (storeId?: string) => {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return request<any[]>(`/api/fnb/areas${qs}`);
};

export const setTableStatus = (tableId: number, status: string) =>
  request(`/api/fnb/tables/${tableId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const getActiveKitchenTickets = (storeId?: string) => {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return request<any[]>(`/api/fnb/kitchen/tickets${qs}`);
};

export const createKitchenTicket = (data: {
  orderId: number;
  tableId?: number;
  priority?: string;
  notes?: string;
  storeId?: string;
}) =>
  request("/api/fnb/kitchen/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateKitchenTicketStatus = (ticketId: number, status: string) =>
  request(`/api/fnb/kitchen/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const updateKitchenItemStatus = (itemId: number, status: string) =>
  request(`/api/fnb/kitchen/items/${itemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ── Customers (Phase 7) ───────────────────────────────────────────────────────

export const searchCustomers = (q: string, storeId?: string) => {
  const params = new URLSearchParams({ q });
  if (storeId) params.set("storeId", storeId);
  return request<any[]>(`/api/customers/search?${params}`);
};

export const getCustomer = (id: number) =>
  request<{ customer: any }>(`/api/customers/${id}`);

export const getCustomerPoints = (id: number) =>
  request<{ customerId: number; balance: number; history: any[] }>(
    `/api/customers/${id}/points`,
  );

export const createCustomer = (data: {
  name: string;
  phone?: string;
  email?: string;
  storeId?: string;
}) =>
  request<{ status: string; customer: any }>("/api/customers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const calculatePromoDiscount = (
  total: number,
  storeId?: string,
  voucherCode?: string,
) => {
  const params = new URLSearchParams({ total: String(total) });
  if (storeId) params.set("storeId", storeId);
  if (voucherCode) params.set("voucherCode", voucherCode);
  return request<{
    discountAmount: number;
    promotionId: number | null;
    voucherCode: string | null;
    description: string;
  }>(`/api/customers/promotions/calculate?${params}`);
};

export const earnLoyaltyPoints = (
  customerId: number,
  saleTotal: number,
  saleId: number | string,
  storeId?: string,
) =>
  request<{ pointsEarned: number; newBalance: number }>(
    `/api/customers/loyalty/${customerId}/earn`,
    {
      method: "POST",
      body: JSON.stringify({ saleTotal, saleId, storeId }),
    },
  );
