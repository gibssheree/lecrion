# Analisis Lecrion — Codebase & UI

Dokumen ini menggabungkan dua analisis dalam satu file Markdown:

- **1. Analisa Codebase (Laporan)**
- **2. Analisa UI**

---

# 1. Analisa Codebase (Laporan)

### Analisis Codebase Lecrion — Laporan Lengkap
## Ringkasan Eksekutif
Lecrion adalah platform POS multi-tenant enterprise-grade yang terintegrasi dengan chatbot WhatsApp. Monorepo TypeScript dengan NestJS backend, React frontend, dan Socket.IO realtime.

## 1. ARSITEKTUR MONOREPO
lecrion/
├── apps/
│   ├── api/         → NestJS REST API (port 3000)
│   ├── pos-web/     → React Cashier POS (port 5174)
│   ├── bot/         → WhatsApp Fonnte integration
│   └── worker/      → Background jobs & schedulers
├── libs/
│   ├── contracts/   → Shared enums, events, DTOs
│   ├── db/          → Prisma service & transactions
│   ├── common/      → Logger, metrics, validation
│   ├── queue/       → Outbox pattern + BullMQ
│   └── realtime/    → Socket.IO channels & publishers
├── prisma/          → Schema + migrations + seed
├── infra/           → Docker, Nginx, monitoring
└── database/        → canteen.db (SQLite dev)
### Tech Stack


| Layer | Tech |
| --- | --- |
| Frontend | React 18 + Vite 5 + Zustand + React Router v6 |
| Backend | NestJS 10 + TypeScript 5 |
| Database | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + Passport + bcryptjs |
| Realtime | Socket.IO v4 |
| PWA | vite-plugin-pwa + Workbox |
| Animation | Framer Motion |
| AI | Gemini 2.0 Flash via Fonnte |

## 2. ROUTER & ROUTES
Frontend — React Router v6 (apps/pos-web/src/routes/index.tsx)
/login                   → LoginPage          (@Public)
/register                → RegisterPage       (@Public)
/dashboard               → PosDashboardPage   (core.dashboard)
/kasir                   → PosPage            (core.pos + RegisterGuard)
/kds                     → KdsPage            (fnb.kds)
/orders                  → OrdersPage         (core.sales)
/products                → ProductsPage       (core.inventory + canManageProducts)
/categories              → CategoriesPage     (core.inventory + canManageProducts)
/inventory               → InventoryPage      (core.inventory + canManageInventory)
/operations              → OperationsPage     (core.inventory + canManageInventory)
/suppliers               → SuppliersPage      (core.suppliers)
/users                   → UsersPage          (core.users + canManageUsers)
/cashflow                → CashflowPage       (core.payments + canViewCashflow)
/invoices                → InvoicesPage       (core.payments + canViewCashflow)
/reports                 → ReportsPage        (core.reports + canViewAllReports)
/settings                → SettingsPage       (core.settings + canChangeSettings)
/chatbot                 → ChatbotOverviewPage
/chatbot/chats           → ChatbotChatPage
/chatbot/live            → ChatbotLiveFeedPage
/chatbot/llm             → ChatbotLlmConsolePage
/chatbot/settings        → ChatbotSettingsPage
/support/stores          → SupportStoresPage  (role: support)
*                        → Navigate /dashboard
### Guard Chain

ProtectedRoute → AuthGuard → ModuleGuard → PermissionGuard
                                ↑ RegisterGuard (khusus /kasir)
Backend — NestJS REST API (port 3000)

| Module | Endpoints Utama |
| --- | --- |
| Auth | POST /api/auth/login, POST /api/auth/register, GET /api/auth/me, POST /api/auth/refresh |
| Catalog | GET/POST /api/products, PATCH /api/products/:id/stock, GET /api/products/barcode/:code |
| Inventory | GET /api/inventory/low-stock, GET /api/inventory/movements, POST /api/inventory/ledger |
| POS | POST /api/pos/sales, POST /api/pos/void, POST /api/pos/refund, POST /api/pos/approval/request |
| Orders | GET/POST /api/orders, PATCH /api/orders/:id/status |
| Register | POST /api/register/open, PATCH /api/register/suspend, POST /api/register/close |
| Cashflow | GET /api/cashflow/entries, POST /api/cashflow/entries |
| Reports | GET /api/reports/sales, /reports/inventory, /reports/cashflow |
| Customers | GET/POST /api/customers, POST /api/customers/:id/points |
| Chatbot | GET /api/chatbot/history, POST /api/chatbot/message |
| LLM | POST /api/llm/chat, GET /api/llm/tools |
| Health | GET /api/health |

## 3. API LAYER
Frontend API Client (apps/pos-web/src/services/api.ts)
### // Token management multi-source
setSharedAuthToken()    → sessionStorage + cookie
getStoredPosToken()     → sessionStorage → localStorage → cookie
clearSharedAuthToken()  → clear all sources

// Auth
login(email, password, loginMode?)   → { accessToken, refreshToken, user }
getMe()                              → current user profile

// Catalog
getProducts(q?, categoryId?)         → products[]
getProductByBarcode(barcode)         → product
createProduct(data)                  → product
updateProduct(id, data)              → product
updateProductStock(id, stock)        → void

// Checkout
createOrder(items, paymentMethod)    → { orderId, receipt }
updateOrderStatus(id, status)        → void

// Register
getActiveRegister()                  → { session }

// Inventory
getLowStock()                        → products[]
getOutOfStock()                      → products[]
Realtime (apps/pos-web/src/services/realtime.ts)
### Socket.IO
- URL: window.location.origin
- Path: /ws/realtime
- Auth: { token, storeId, apiKey }
- Transport: websocket + polling fallback
- Rooms: "dashboard", "store:{storeId}"

On connect: emit("join", "dashboard") + emit("join", "store:{storeId}")
## 4. STATE MANAGEMENT — Zustand Stores

| Store | File | State |
| --- | --- | --- |
| useAuthStore | store/auth.store.ts | user, token, isLoading, error |
| useCartStore | store/cart.store.ts | carts[], activeCartId, items (derived), subtotal (derived) |
| useRegisterStore | store/register.store.ts | session, status, initialized |
| useToastStore | store/toast.store.ts | toasts[] |

### Cart Actions

addItem, removeItem, updateQty, clear
createCart, switchCart, holdActiveCart — multi-table support
Stock-tracked items capped by available stock
### Auth Persistence

persist middleware: { name: "pos-auth", partialize: (s) => ({ token, user }) }
## 5. KOMPONEN UI
App → AppProviders
       ├── Auth restoration
       ├── Register session refresh
       ├── OnlineStatusProvider (PWA offline)
       └── RouterProvider
           └── PosAppShell (dashboard layout)
               └── PosShell (cashier layout)
### Features
├── catalog/      → ProductGrid, ProductCard, SearchBar, CategoryChips
├── checkout/     → PaymentMethodSelector, SplitPaymentPanel, SuccessScreen
├── cart/         → CartItem, CartSummary, CartList
├── orders/       → OrderStatusBadge, ManagerApprovalModal, RecentOrdersDrawer
├── register/     → RegisterGatePage, CloseRegisterModal, SuspendResumeButton
├── inventory/    → StockAlertBar
└── chatbot/      → ChatbotUi
### UI Components (src/components/ui/)
- Untracked (baru ditambahkan), belum committed
## 6. CUSTOM HOOKS (apps/pos-web/src/hooks/)

| Hook | Return | Fungsi |
| --- | --- | --- |
| useApi<T> | { data, loading, error, reload } | Generic fetch + auto-refresh |
| useSocket(events[]) | { connected, events } | Socket.IO listener |
| useRegister() | { session, isLoading, refresh, openRegister, closeRegister } | Session management |
| usePermissions() | Role-based flags (canVoid, canRefund, dll) | RBAC checks |
| useStoreInfo() | { store, taxMode, serviceCharge, enabledModules } | Store config |
| useStoreCapabilities() | { enabledModules, businessVertical, verificationStatus } | Module gating |
| useProducts(q?, categoryId?) | { products, loading, error } | Catalog fetch |
| useRealtimeSync() | — | Subscribe realtime events |
| useOnlineStatus() | { isOnline } | PWA offline detect |
| useUserMap() | Map<userId, { name, email, role }> | User cache |
| usePagination(items, pageSize) | { currentPage, pageCount, pageItems, goToPage } | Paginate |

## 7. AUTHENTICATION & GUARDS
Backend JWT Flow
POST /api/auth/login
  → bcrypt.compare(password, hash)
  → issue access_token (15m) + refresh_token (7d)
  → JWT payload: { actor, email, role, storeId, tenantId, channel }
### Guard Chain (global)
  JwtAuthGuard → RolesGuard → TenantGuard → StoreScopeGuard
### Decorators
  @Public()           – skip auth
  @Roles('owner')     – require role
  @CurrentUser()      – inject AuthUser
Service-to-Service Auth
BOT_API_KEY       → bot-service identity
WORKER_API_KEY    → worker-service identity
DASHBOARD_API_KEY → dashboard identity
Frontend Guards

| Guard | Kondisi | Redirect |
| --- | --- | --- |
| AuthGuard | No JWT | → /login |
| RegisterGuard | No active register | → /register-gate |
| ModuleGuard | Module not enabled | → /dashboard |
| PermissionGuard | Permission denied | render null |

## 8. DATABASE LAYER
Prisma Schema (SQLite dev → PostgreSQL prod)
### Tabel Utama

users, stores, store_settings, tenants
menu (products), product_categories
inventory_locations, inventory_ledger
orders, order_items, payments
pos_sales, pos_corrections, manager_approvals
cash_register_sessions, cashflow_entries
customers, customer_points
suppliers, operation_documents
fnb_tables, fnb_kitchen_tickets
chat_history, cart_items, carts
audit_logs (immutable append-only)
events_inbox (outbox pattern)
idempotency_keys (deduplication)
### Konvensi

Timestamps: ISO 8601 strings (bukan DateTime — SQLite limitation)
Status: plain strings (canonical values di libs/contracts)
Foreign keys: onDelete: Cascade | SetNull | NoAction
## 9. BACKEND MODULES (NestJS)

| Module | Services Utama |
| --- | --- |
| Auth | AuthService |
| Catalog | CatalogService, ProductBarcodesService, ProductVariantsService |
| Inventory | InventoryService, InventoryLedgerService, InventoryLocationService |
| POS | PosSalesService, PosCorrectionsService, PosApprovalService, PosCalculationService |
| Checkout | CheckoutService, IdempotencyService |
| Orders | OrdersService |
| Payments | PaymentsService |
| Cashflow | CashflowService |
| Register | RegisterService |
| Reports | ReportsService, ReadModelService, PosReportsService |
| Customers | CustomersService, LoyaltyService, PromotionsService |
| Chatbot | HistoryService, CartService |
| LLM | LlmService, LlmAdapterService, LlmToolsService, NutritionAdvisorService |
| Bot | BotDispatchService, ScheduledReportsService |
| FnB | TablesService, KitchenService |
| Operations | OperationsService |
| Suppliers | SuppliersService |

### Infrastructure Modules

DatabaseModule → PrismaService
ConfigModule → AppConfigService
SyncModule → Outbox processor
RealtimeModule → Socket.IO init
## 10. ARSITEKTUR PATTERNS
Event Sourcing / Outbox Pattern
API Command → Domain Handler
### → Prisma Transaction
               ├── Update domain tables
               └── Write events_inbox (SAME transaction)
           → Worker polls events_inbox
           → Worker publishes Socket.IO + updates read models
           → Event marked processed
Multi-Tenant Isolation
Database:    WHERE store_id = ? AND tenant_id = ?
Realtime:    room = "store:{storeId}"
Cache keys:  "{storeId}:products"
JWT claims:  user.storeId + user.tenantId validated per request
RBAC Hierarchy
owner (100) > manager (80) > cashier (60) > inventory_staff (50) > support (40)
Fine-grained: canVoid, canRefund, canApplyDiscount,
              canManageProducts, canManageUsers,
              canApproveWithoutPin, canViewCashflow, ...
Idempotency
Idempotency-Key header (UUID)
→ Check idempotency_keys table
→ If exists: return cached result (no duplicate processing)
→ If not: process + store result + TTL (24h)
Module Feature Gating
Store capabilities: { enabledModules: ["core.pos", "fnb.kds", ...], businessVertical }
→ <ModuleGuard requiredModule="fnb.kds"> untuk protect routes
→ 60+ platform modules defined di libs/contracts
→ businessVertical: general | retail | restaurant_cafe | wholesale | warehouse | ...
## 11. LIBS/CONTRACTS — Single Source of Truth
File: libs/contracts/src/

### Semua enums, events, types dikonsumsi oleh api, bot, worker, pos-web

UserRole — 7 roles
OrderStatus — 8 states (pending → completed/refunded)
PaymentMethod — Cash, Transfer, QRIS, GoPay
StockMovementType — SALE, RESTOCK, ADJUSTMENT, WASTE, RETURN, TRANSFER
BusinessVertical — 10 verticals
PlatformModule — 60+ modules
EVENT_TYPES — 40+ event types (canonical)
## 12. CHECKOUT DATA FLOW (End-to-End)
## 1. User pilih produk → Zustand cart.store (addItem)
## 2. User pilih payment method
## 3. POST /api/pos/sales { items, paymentMethod, cashierId }
## 4. API:
   - Validate JWT + role + register session
### - Prisma transaction
     a. Create pos_sales (immutable receipt)
     b. Create pos_sale_items
     c. Update menu stock (if tracked)
     d. Create inventory_ledger (SALE)
     e. Create cashflow_entry (INCOME)
     f. Write events_inbox
## 5. Worker: emit Socket.IO order.created
## 6. Dashboard: realtime update
## 7. POS-Web: SuccessScreen + clear cart
## 13. KONFIGURASI

| File | Purpose |
| --- | --- |
| apps/pos-web/vite.config.ts | Vite + PWA + proxy /api → :3000 |
| tsconfig.json | Path aliases: @libs/*, @api/*, @bot/* |
| prisma.config.ts | SQLite dev, PostgreSQL prod |
| .env | JWT secrets, Gemini API key, Fonnte token, API keys |
| infra/docker/ | Dockerfiles + docker-compose |
| infra/nginx/ | Reverse proxy + WebSocket routing |

## 14. DEPLOYMENT
### Dev
  npm run start:api:dev   → NestJS (port 3000)
  npm run dev:pos         → React (port 5174)
  npm run start:worker    → Worker
  npm run start:bot       → Bot
### Prod
  docker-compose up -d    → api + worker + postgres
  Nginx reverse proxy     → /api → :3000, / → static files
## Kesimpulan
### Lecrion adalah platform POS enterprise-grade yang dirancang dengan prinsip

Event-driven + Outbox Pattern — atomisitas event dijamin di level database transaction
Multi-tenant isolation — setiap toko terisolasi penuh di level database, realtime, dan JWT
Offline-first PWA — kasir tetap bisa checkout saat offline, sync ketika online
Modular feature gating — 60+ modules, per-vertical, per-store
RBAC berlapis — 5 role hierarchy + 10+ fine-grained permissions
AI integration — Gemini + WhatsApp Fonnte untuk customer service chatbot
Monorepo shared contracts — satu sumber kebenaran untuk types, enums, events

---

# 2. Analisa UI

### Analisis Ui Mendalam — Lecrion Pos Web
## 1. DESIGN SYSTEM — CSS VARIABLES (apps/pos-web/src/index.css)
Color Palette (:root)
### Backgrounds
  --bg-base:     #f8fafc   ← halaman utama, slate-50
  --bg-surface:  #ffffff   ← card, panel, modal
  --bg-elevated: #f1f5f9   ← row hover, input bg, elevated surface
  --bg-overlay:  rgba(0,0,0,0.4)  ← backdrop modal & drawer
### Border
  --border:       #e2e8f0  ← border universal
  --border-focus: #3b82f6  ← border saat focus input
### Brand / Primary
  --primary:      #3b82f6  ← Blue-500 (CTA buttons, active chips, focus)
  --primary-dark: #2563eb  ← Blue-600 (hover state primary)
  --primary-light: #eff6ff ← Blue-50 (hover ghost bg, input chip active bg)
### Status — Stock / Inventory
  --stock-ok:     #22c55e  ← Green-500
  --stock-low:    #f59e0b  ← Amber-500
  --stock-out:    #ef4444  ← Red-500
  --stock-ok-bg:  #f0fdf4  ← Green-50
  --stock-low-bg: #fffbeb  ← Amber-50
  --stock-out-bg: #fef2f2  ← Red-50
### Semantic
  --success: #22c55e
  --warning: #f59e0b
  --danger:  #ef4444
  --info:    #3b82f6
### Text Hierarchy
  --text-primary:   #0f172a  ← Slate-900 (headings, values)
  --text-secondary: #475569  ← Slate-600 (labels, secondary)
  --text-muted:     #94a3b8  ← Slate-400 (placeholder, timestamps)
  --text-inverse:   #ffffff  ← on dark backgrounds
### Radius
  --radius-sm: 6px    ← buttons, inputs, chips small
  --radius-md: 10px   ← cards, product cards
  --radius-lg: 16px   ← modals, auth card
### Shadow
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08)
  --shadow-md: 0 4px 12px rgba(0,0,0,0.10)
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12)
Brand Accent — Purple #3017b8
### Ini adalah warna brand signature Lecrion yang berbeda dari primary blue

Avatar user (navbar + topbar) → background #3017b8
Sidebar background utama → #3017b8
Login mode switcher active → text #3017b8
Login input focus ring → rgba(48,23,184,0.12)
Auth register link → #3017b8
--primary blue adalah untuk CTA/interactive, purple adalah brand identity
Auth Screen — Teal Gradient
Background visual: linear-gradient(135deg, #d0f5f0 → #b2ede6 → #8fe8df)
Base: #b2ede6 (teal soft)
Radial glow: rgba(0,200,180,0.18) di corner kiri atas
Text: dark forest #0f2d24, #1a3a32
## 2. LAYOUT ARCHITECTURE — LAPISAN PER LAPISAN
Layer 1: POS App Shell (Dashboard Layout)
┌────────────────────────────────────────────────┐
│  .pos-app  (grid: 48px navbar + 1fr body)      │
│                                                 │
│ ┌────────────────────────────────────────────┐  │
│ │ .pos-navbar (h=48px, bg=#fff, shadow)      │  │
│ │  [logo] ──────────────── [bell][user][···] │  │
│ └────────────────────────────────────────────┘  │
│                                                 │
│ ┌─────────┬──────────────────────────────────┐  │
│ │.pos-    │                                  │  │
│ │sidebar  │  .pos-content                   │  │
│ │(230px)  │  (flex col, bg=#f8fafc)         │  │
│ │bg:      │                                  │  │
│ │#3017b8  │  .pos-page-header (pad 20px 24px)│  │
│ │         │  .pos-page-body (overflow-y auto)│  │
│ │         │                                  │  │
│ └─────────┴──────────────────────────────────┘  │
└────────────────────────────────────────────────┘
### COLLAPSED STATE (.sidebar-collapsed)
  .pos-body grid: 56px | 1fr (animasi 0.28s cubic-bezier)
  nav-label: max-width 0 + opacity 0
  section labels: opacity 0 + max-height 0
Layer 2: POS Terminal (Kasir Layout)
┌──────────────────────────────────────────────────────┐
│  .pos-shell  (grid: 56px topbar + 1fr main + 44px bottom) │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ .topbar (h=56px, bg=#fff, shadow-sm)           │   │
│ │  [brand] [divider] [cashier-info] ── [actions] │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────┬──────────┬─────────┐                   │
│ │.panel    │.panel    │.panel   │ .pos-main          │
│ │ 40%      │ 35%      │ 25%     │ (grid 3 cols)      │
│ │ Product  │ Cart     │ Payment │                    │
│ │ Rail     │ Panel    │ Drawer  │                    │
│ └──────────┴──────────┴─────────┘                   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ .bottombar (h=44px, bg=#fff, border-top)       │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
Layer 3: Auth Screen (Login/Register)
┌──────────────────────────────┬─────────────────┐
│  .auth-visual (flex 1)       │  .auth-panel    │
│  Teal gradient bg            │  (w=520px)      │
│  Radial glow #00c8b4         │  bg=#ffffff     │
│                              │  shadow-left    │
│  ┌────────────────────────┐  │                 │
│  │ .auth-visual-copy      │  │  .auth-card     │
│  │  h1 "Satu platform..." │  │  (max-w 420px)  │
│  │  .auth-biz-cycle       │  │  - logo         │
│  │  (AnimatePresence)     │  │  - heading      │
│  │  p description         │  │  - mode-switch  │
│  │  .auth-pills           │  │  - form         │
│  └────────────────────────┘  │                 │
│  .auth-illustration-wrap     │                 │
│  (absolute, bottom, 50%      │                 │
│   transform translateX(-50%) │                 │
│   lecrion_3d.png)            │                 │
└──────────────────────────────┴─────────────────┘
### Responsive @media (max-width: 1024px)
  grid-template-columns: 1fr (visual hidden)
Z-Index Layers
z-10   → Sidebar (pos-sidebar)
z-10   → Topbar (pos-navbar)
z-30   → Navbar (pos-navbar)
z-30   → Business info panel (pos-biz-panel)
z-50   → Drawer overlay
z-51   → Drawer (right panel, 380px)
z-100  → Modal overlay + modal
z-9999 → Toast (toaster-root, bottom-right)
## 3. SIDEBAR — Detail Visual
### .pos-sidebar
  background: #3017b8     ← BRAND PURPLE
  width: 230px (collapsed: 56px)
  border-right: 1px solid rgba(255,255,255,0.12)
  transition: 0.28s cubic-bezier(0.4, 0, 0.2, 1)

### Store Switcher (.pos-store-switcher)
  grid: 36px | 1fr | 32px
  padding: 12px 10px 12px 12px
  border-bottom: rgba(255,255,255,0.12)

### Nav Item (.pos-nav-item)
  color: rgba(255,255,255,0.58)   ← inactive
  hover: rgba(255,255,255,0.10) bg + #fff text
  active: rgba(255,255,255,0.14) bg
          + inset shadow: 0 0 0 1px rgba(255,255,255,0.2)
          + #fff text
  font: 12.5px / 700 / Inter
  border-radius: 6px
  padding: 7px 12px, margin: 1px 6px

### Section Label (.pos-sidebar-section)
  font: 9px / 800 / uppercase / letter-spacing 0.08em
  color: rgba(255,255,255,0.28)

### Avatar (.pos-navbar-avatar)
  bg: #3017b8
  color: #fff
  font: 12px / 800
  size: 30px circle
## 4. KOMPONEN UI PRIMITIF — Detail
Button System
### Base .btn
  min-height: 44px  ← touch target
  padding: 9px 16px
  font: 13px / 600
  border-radius: var(--radius-sm) = 6px
  transition: all 0.15s ease

### Variants
  .btn-primary  → bg #3b82f6  | hover #2563eb
  .btn-danger   → bg #ef4444  | hover #dc2626
  .btn-success  → bg #22c55e  | hover #16a34a
  .btn-ghost    → transparent + border #e2e8f0
                  hover: border #3b82f6, text #3b82f6, bg #eff6ff

### Sizes
  .btn-lg  → 52px min-height, 15px font, 14px 20px pad
  .btn-sm  → 36px min-height, 12px font, 6px 12px pad
  .btn-full → 100% width

Disabled: opacity 0.4, cursor not-allowed
Form Elements
### .form-input
  padding: 10px 12px
  border: 1px solid #e2e8f0
  border-radius: 6px (--radius-sm)
  font: 14px / Inter
  focus: border #3b82f6 + box-shadow rgba(59,130,246,0.1) 3px

### .auth-input (Login screen version)
  min-height: 50px (taller!)
  padding: 0 14px 0 42px (icon left)
  border-radius: 8px
  focus: border #3017b8 + shadow rgba(48,23,184,0.12)

### .form-label
  font: 12px / 600
  color: #475569 (text-secondary)
  margin-bottom: 4px
Chips / Categories
### .chip
  padding: 5px 12px
  border-radius: 20px  ← pill shape
  font: 12px / 600
  border: 1px solid #e2e8f0
  bg: #ffffff, color: #475569

### .chip--active
  bg: #3b82f6 (--primary)
  border: #3b82f6
  color: #ffffff

### .category-chips
  display: flex, overflow-x: auto
  gap: 6px, padding: 8px 12px
  border-bottom: 1px solid var(--border)
Stock Badges
### .stock-badge
  display: inline-flex
  padding: 2px 7px
  border-radius: 10px
  font: 11px / 600

  --ok:   bg #f0fdf4, color #22c55e (green)
  --low:  bg #fffbeb, color #f59e0b (amber)
  --out:  bg #fef2f2, color #ef4444 (red)

### .status-badge (Register status)
  padding: 3px 9px
  border-radius: 10px
  font: 11px / 600

  --open:      bg #f0fdf4, color #166534, border #bbf7d0
  --suspended: bg #fffbeb, color #92400e, border #fde68a
  --closed:    bg #fef2f2, color #991b1b, border #fecaca
  --none:      bg --bg-elevated, color --text-muted
Modal & Drawer
### .modal-overlay
  position: fixed inset: 0
  bg: rgba(0,0,0,0.4)
  z-index: 100
  display: flex align-center justify-center

### .modal
  bg: #ffffff
  border-radius: 16px (--radius-lg)
  padding: 28px
  max-width: 440px
  shadow: --shadow-lg

### .drawer
  position: fixed right: 0 top: 0
  width: 380px, height: 100vh
  bg: #ffffff
  z-index: 51
  shadow: --shadow-lg

### .drawer-header
  padding: 16px 20px
  border-bottom
  font: 15px / 700
  flex justify-content: space-between
Toast System (apps/pos-web/src/components/ui/Toaster.tsx)
Position: fixed bottom-right, z-index 9999
Animation: toastIn (fade + slide dari kanan, 0.22s)

### Colors (inline styles)
  success: bg #f0fdf4, border #86efac, text #166534, icon #22c55e
  error:   bg #fef2f2, border #fca5a5, text #991b1b, icon #ef4444
  info:    bg #eff6ff, border #93c5fd, text #1e40af, icon #3b82f6
  warning: bg #fffbeb, border #fcd34d, text #92400e, icon #f59e0b

### Icons
  success → CheckCircle2
  error   → AlertCircle
  info    → Info
  warning → AlertTriangle
## 5. PAGES — Visual Structure Detail
Dashboard (apps/pos-web/src/pages/PosDashboardPage.tsx)
### .summary-grid (4 cards, gap 16px, margin-bottom 24px)
  Card 1: Revenue Hari Ini
    icon TrendingUp (green)
    value: 24px/800 "Rp{amount}"
    sub: "{count} transaksi"

  Card 2: Penjualan Bulan Ini
    icon ShoppingBag (blue/primary)

  Card 3: Pesanan Aktif
    icon Package (amber)

  Card 4: Status Register
    icon DollarSign (green)
    value: dot indicator animasi glow
    dot: 9px circle dengan boxShadow glow saat OPEN
### .dashboard-grid (3 col, gap 16px)
  [Shift Card] [Live Feed Card] [Cash View Card]

### Shift Card
    Expected cash: bg #f0fdf4 (green surface)
    Rows: shift-row dengan label/value pattern
    CTA buttons: Kasir (primary) | Suspend | Tutup (danger)

### Live Feed
    Radio icon + green glow dot saat connected
    Socket.IO events listed real-time
    Recent orders mini list

### Cash View
    Tab bar: today | week | month
    Active tab: bg #0f172a (text-primary) + white text
    Cash rows dengan 2-col layout
Login (apps/pos-web/src/features/auth/LoginPage.tsx)
auth-screen: grid 1fr | 520px
### LEFT (auth-visual)
  bg: teal gradient radial + linear
  h1: clamp(34px,4vw,58px) / 800 / #0f172a
  auth-biz-cycle: AnimatePresence cycling text
    animation: blur(10px)→0 + scale 0.92→1 + opacity 0→1
    duration: 0.28s easeOut
    cycling: 8 business types, interval 2500ms
  auth-pills: pill buttons dengan Framer Motion
    whileHover: scale 1.08, y -2, boxShadow
    spring: stiffness 420, damping 24
  auth-illustration: lecrion_3d.png
    absolute bottom center, max-height 60vh
### RIGHT (auth-panel)
  bg: #ffffff
  border-left: 1px solid #dce6f3
  box-shadow: -24px 0 60px rgba(15,23,42,0.08)

### auth-mode-switcher (segmented control)
    3-col grid, bg #f5f7fb, border #dbe3ef, radius 9px
    active: bg #fff, color #3017b8, shadow

### auth-input
    height 50px, radius 8px
    focus: border #3017b8, ring rgba(48,23,184,0.12)
    icon: Mail / Lock (lucide, size 16, color #94a3b8)
    password toggle: Eye/EyeOff button (absolute right)

  submit button: .btn.btn-primary.btn-full.btn-lg
    loading state: spinner + "Memverifikasi" text
## 6. TYPOGRAPHY SYSTEM
Font: "Inter" (Google Fonts), weights 400-800
Base: 14px / 1.5 / antialiased
### Heading Scale
  28px / 800  → auth-title h2
  24px / 800  → summary-card-value (amounts)
  clamp(34-58px) / 800 → auth-visual h1
  18px / 700  → modal-title, pos-page-heading
  16px / 700/800 → pos-topbar-title, topbar-brand
  15px / 700  → drawer-header
  13.5px/500  → nav-item
  13px / 600  → panel-header, body text
  12px / 600  → form-label, chip, badge, avatar role
  11px / 600  → stock-badge, status-badge, timestamps
  10px / 600  → sidebar section label (uppercase)
  9px / 800   → sidebar-section (.pos-sidebar-section)
## 7. ANIMATION & MOTION
Framer Motion (LoginPage)
// Business type cycling (AnimatePresence)
initial:  { opacity: 0, scale: 0.92, filter: "blur(10px)" }
animate:  { opacity: 1, scale: 1,    filter: "blur(0px)"  }
exit:     { opacity: 0, scale: 0.94, filter: "blur(10px)" }
transition: { duration: 0.28, ease: "easeOut" }

// Auth pill hover
whileHover: { scale: 1.08, y: -2, boxShadow: "0 18px 36px rgba(15,23,42,0.14)" }
whileTap:   { scale: 0.98 }
transition: { type: "spring", stiffness: 420, damping: 24 }
CSS Animations
/* Spinner */
@keyframes spin { to { transform: rotate(360deg) } }
.spinner: 18px × 18px, border-top-color: var(--primary), 0.8s linear infinite

/* Toast entrance */
@keyframes toastIn: fade + translateX slide, 0.22s

/* Sidebar collapse */
transition: grid-template-columns 0.28s cubic-bezier(0.4, 0, 0.2, 1)

/* Nav label collapse */
max-width: 200px → 0 + opacity 1 → 0, 0.2s ease

/* Store category chevron rotate */
transform: rotate(180deg), 0.16s ease

/* Register dot glow */
boxShadow: "0 0 8px var(--stock-ok)"  → saat status OPEN

/* Live feed dot glow */
boxShadow: "0 0 6px var(--stock-ok)"  → saat socket connected
## 8. ICON SYSTEM
Library: lucide-react

### Icon Sizes

18px → navbar buttons, main actions
16px → auth input icons
15px → dashboard CTA (LockOpen, ShoppingCart)
14px → dashboard headers (DollarSign, Radio, TrendingUp)
13px → form labels, table actions
12px → summary-card-label icons (colored)
11px → shift row mini icons (Banknote, CreditCard)
### Icons per Halaman

LoginPage:     AlertCircle, BarChart3, Eye/EyeOff, Lock, Mail,
               MessageSquareText, Store, UserCog
Dashboard:     TrendingUp, ShoppingBag, Package, DollarSign, LockOpen,
               Lock, RefreshCw, ShoppingCart, Radio, TrendingDown,
               CreditCard, Banknote
PosAppShell:   Bell, ChevronDown, LogOut, MoreHorizontal, PanelLeftClose,
               PanelLeftOpen, Settings, Store
## 9. COMPONENT CATALOG LENGKAP
Layout Components (apps/pos-web/src/components/layout/)

| File | Purpose | Key CSS Classes |
| --- | --- | --- |
| apps/pos-web/src/components/layout/PosAppShell.tsx | Dashboard layout wrapper | .pos-app, .pos-navbar, .pos-body, .pos-sidebar, .pos-content |
| apps/pos-web/src/components/layout/PosShell.tsx | Kasir 3-panel layout | .pos-shell, .pos-main, .topbar, .bottombar |
| apps/pos-web/src/components/layout/TopBar.tsx | Kasir header bar | .topbar, .topbar-brand, .topbar-actions |
| apps/pos-web/src/components/layout/BottomBar.tsx | Kasir footer status | .bottombar |
| apps/pos-web/src/components/layout/ProductRail.tsx | Left column (40%) catalog | .panel, .product-grid |
| apps/pos-web/src/components/layout/CartPanel.tsx | Center column (35%) cart | .panel, .cart-item |
| apps/pos-web/src/components/layout/PaymentDrawer.tsx | Right column (25%) checkout | .panel, .payment-methods, .total-display |

Feature Components

| File | Purpose | Pattern |
| --- | --- | --- |
| apps/pos-web/src/features/catalog/ProductCard.tsx | Product tile | .product-card, .stock-badge |
| apps/pos-web/src/features/catalog/ProductGrid.tsx | 2-col product grid | .product-grid |
| apps/pos-web/src/features/catalog/CategoryChips.tsx | Horizontal chip scroll | .category-chips, .chip, .chip--active |
| apps/pos-web/src/features/catalog/SearchBar.tsx | Search input with icon | .search-bar, .search-input |
| apps/pos-web/src/features/cart/CartItem.tsx | Cart line item | .cart-item, .qty-adjuster, .qty-btn |
| apps/pos-web/src/features/cart/CartSummary.tsx | Subtotal display | .total-display, .total-amount |
| apps/pos-web/src/features/checkout/PaymentMethodSelector.tsx | Payment grid buttons | .payment-methods, .payment-method-btn--active |
| apps/pos-web/src/features/checkout/SuccessScreen.tsx | Post-checkout UI | Modal-like success state |
| apps/pos-web/src/features/orders/OrderStatusBadge.tsx | Order status pill | .status-badge variants |
| apps/pos-web/src/features/orders/RecentOrdersDrawer.tsx | Slide drawer | .drawer, .drawer-header, .drawer-body |
| apps/pos-web/src/features/register/RegisterGatePage.tsx | Open register form | Modal-style centered form |
| apps/pos-web/src/features/register/SuspendResumeButton.tsx | Suspend toggle | .btn-ghost / .btn-warning |
| apps/pos-web/src/components/ui/Toaster.tsx | Toast notifications | .toaster-root, .toast-item (inline styles) |
| apps/pos-web/src/components/ui/Pagination.tsx | Page controls | Pagination buttons |

## 10. RESPONSIVE BEHAVIOR
Default: Desktop-first, fixed layout
@media (max-width: 1024px):
  auth-screen: 1 column (visual hidden, panel full width)
  auth-panel padding: 32px 24px
### POS Terminal (/kasir)
  TIDAK responsive — fixed 3-col grid
  Designed untuk layar kasir/desktop dedicated
### Sidebar
  Collapsible ke 56px (icon-only mode)
  Keyboard shortcut atau button toggle
### Scroll
  Scrollbar custom: 4px width, border transparent, thumb #e2e8f0
  Scroll terjadi di .pos-page-body, .panel-body, .drawer-body
## 11. LOCALIZATION & UX COPY
### Semua copy dalam Bahasa Indonesia

"Masuk sebagai Operator/Manager/Owner"
"Satu platform untuk banyak bisnis."
"Hari Ini / Minggu (est.) / Bulan"
"Kas Diharapkan (Sistem)"
"Pesanan Aktif / Menunggu / Selesai"
"Buka Register / Tutup Register & Hitung Kas"
"Stok Menipis / Stok Habis"
"Terverifikasi / Menunggu Verifikasi / Belum Diverifikasi"
"Kasir / Inventori / Manager / Owner / Support"
"Jenis Bisnis / Kelola Bisnis"
Format Currency: Rp{amount} (tanpa spasi, pakai fmt() utility)

Time Format: toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

### Quick Reference — Warna Aksen

| Konteks | Warna | Hex |
| --- | --- | --- |
| Brand sidebar + avatar | Purple | #3017b8 |
| CTA button + focus + active | Blue | #3b82f6 |
| Success + stock OK + open | Green | #22c55e |
| Warning + stock low + suspended | Amber | #f59e0b |
| Danger + stock out + closed | Red | #ef4444 |
| Auth screen background | Teal | #b2ede6 |
| Auth text dark | Forest | #0f2d24 |
| Page background | Slate-50 | #f8fafc |
| Surface (card/panel) | White | #ffffff |
| Primary text | Slate-900 | #0f172a |
| Muted text | Slate-400 | #94a3b8 |
| Border universal | Slate-200 | #e2e8f0 |

Dua warna yang wajib diingat: #3017b8 (brand purple) dan #3b82f6 (interactive blue) — keduanya berbeda dan punya peran yang distinct dalam sistem ini.
