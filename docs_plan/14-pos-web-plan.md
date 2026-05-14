# POS Web — Cashier UI Plan

`apps/pos-web` is the dedicated cashier-facing checkout experience.
It is separate from `apps/dashboard` (admin + chatbot console) by design.

Reference: `docs_plan/03-file-architecture.md` § apps/pos-web

---

## 1. Scope

### In scope

- Cashier login and session management
- Register open / suspend / resume / close
- Product search and quick-add
- Cart management (add, remove, adjust qty)
- Payment capture and order creation
- Order status view (recent transactions)
- Stock-aware UI (low stock / out of stock warnings)
- Realtime sync (new orders, stock changes)

### Out of scope (stays in `apps/dashboard`)

- Analytics and revenue reports
- LLM console
- Complex settings
- Audit viewer
- Chatbot history
- Detailed inventory management

---

## 2. Wireframe — Screen Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 1: Auth                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Lecrion POS                                             │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  Email / Cashier ID  [________________]                  │   │
│  │  Password            [________________]                  │   │
│  │                      [  Login  ]                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 2: Register Gate (no active session)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Tidak ada sesi kasir aktif                              │   │
│  │  Modal Awal (Rp): [________]                             │   │
│  │  Catatan:         [________]                             │   │
│  │                   [ Buka Register ]                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 3: POS Main (3-panel layout)                             │
│                                                                  │
│  ┌── TOP BAR ──────────────────────────────────────────────┐    │
│  │ 🏪 Lecrion POS  │ Kasir: admin │ 12:30  │ ● Online     │    │
│  │ Register #3 OPEN │ [Suspend] [Close Register]           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌── LEFT: CATALOG ──┐  ┌── CENTER: CART ──┐  ┌── RIGHT ──┐    │
│  │ [Search produk..] │  │ Keranjang         │  │ TOTAL     │    │
│  │                   │  │ ─────────────     │  │           │    │
│  │ [All][Makanan]    │  │ Nasi Goreng  x2   │  │ Rp 24.000 │    │
│  │ [Minuman][Snack]  │  │ Rp 12.000 each    │  │           │    │
│  │                   │  │ [−][2][+] [🗑]    │  │ [CASH]    │    │
│  │ ┌──────┐ ┌──────┐ │  │                   │  │ [TRANSFER]│    │
│  │ │Nasi  │ │Milo  │ │  │ Milo         x1   │  │ [QRIS]    │    │
│  │ │Goreng│ │      │ │  │ Rp 8.000          │  │           │    │
│  │ │12.000│ │8.000 │ │  │ [−][1][+] [🗑]    │  │ [BAYAR]   │    │
│  │ │stok:8│ │stok:3│ │  │                   │  │           │    │
│  │ │[+ADD]│ │[+ADD]│ │  │ ─────────────     │  │           │    │
│  │ └──────┘ └──────┘ │  │ Subtotal Rp32.000 │  │           │    │
│  │                   │  │ [Clear Cart]       │  │           │    │
│  │ ┌──────┐ ┌──────┐ │  └───────────────────┘  └───────────┘    │
│  │ │Pisang│ │Pop   │ │                                           │
│  │ │Goreng│ │Ice   │ │                                           │
│  │ │5.000 │ │HABIS │ │                                           │
│  │ │stok:5│ │stok:0│ │                                           │
│  │ │[+ADD]│ │ ─── │ │                                           │
│  │ └──────┘ └──────┘ │                                           │
│  └───────────────────┘                                           │
│                                                                  │
│  ┌── BOTTOM BAR ───────────────────────────────────────────┐    │
│  │ ⚠ 3 produk stok menipis  │ [Recent Orders] │ ● Synced   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 4: Payment Modal                                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Total: Rp 32.000                                        │   │
│  │  Metode: [Cash] [Transfer] [QRIS]                        │   │
│  │                                                          │   │
│  │  Uang diterima: [________]                               │   │
│  │  Kembalian:     Rp 8.000                                 │   │
│  │                                                          │   │
│  │  [Batal]              [Konfirmasi Pembayaran]            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 5: Success / Receipt                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✓ Pembayaran Berhasil                                   │   │
│  │  Order #42                                               │   │
│  │  Total: Rp 32.000  │  Bayar: Rp 40.000                  │   │
│  │  Kembalian: Rp 8.000                                     │   │
│  │                                                          │   │
│  │  [Transaksi Baru]        [Lihat Order]                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCREEN 6: Recent Orders Drawer (slide-in from right)            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Transaksi Hari Ini                          [×]         │   │
│  │  ─────────────────────────────────────────────────────   │   │
│  │  #42  Rp32.000  Cash     Not Ready  12:28                │   │
│  │  #41  Rp15.000  Transfer Completed  12:15                │   │
│  │  #40  Rp8.000   QRIS     Completed  11:58                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Layout Specification

### Top Bar

| Element         | Detail                                                        |
| --------------- | ------------------------------------------------------------- |
| Brand           | "Lecrion POS" + store name                                    |
| Register status | Badge: `OPEN` (green) / `SUSPENDED` (yellow) / `CLOSED` (red) |
| Cashier name    | From auth session                                             |
| Clock           | Live HH:MM                                                    |
| Connection      | Dot indicator: green = synced, yellow = connecting            |
| Actions         | `[Suspend]` `[Close Register]` `[Recent Orders]`              |

### Left Panel — Catalog (40% width)

| Element        | Detail                                                   |
| -------------- | -------------------------------------------------------- |
| Search         | Large input, auto-focus on load                          |
| Category chips | All / Makanan / Minuman / Snack — from `inferCategory()` |
| Quick filter   | All / Low Stock / Out of Stock                           |
| Product cards  | Grid 2-col, touch-friendly min 44px tap target           |
| Card content   | Name, price, stock badge, `[+ Add]` button               |
| Stock badge    | Green ≥ 6, Yellow 1–5, Red = 0 (disabled)                |

### Center Panel — Cart (35% width)

| Element      | Detail                                        |
| ------------ | --------------------------------------------- |
| Item list    | Name, price, qty adjuster `[−][n][+]`, delete |
| Qty adjuster | Inline, min 1, max = available stock          |
| Subtotal     | Running total, always visible                 |
| Clear cart   | Danger button at bottom                       |
| Empty state  | "Keranjang kosong — pilih produk di kiri"     |

### Right Panel — Payment (25% width)

| Element        | Detail                                        |
| -------------- | --------------------------------------------- |
| Total          | Large, dominant typography                    |
| Payment method | `[Cash]` `[Transfer]` `[QRIS]` toggle buttons |
| Cash received  | Input (only shown for Cash)                   |
| Change         | Auto-calculated                               |
| Pay button     | Full-width, primary, disabled if cart empty   |

### Bottom Bar

| Element            | Detail                                         |
| ------------------ | ---------------------------------------------- |
| Stock alerts       | Count of low/out-of-stock items                |
| Sync status        | Last synced timestamp                          |
| Keyboard shortcuts | `F1` = focus search, `F2` = pay, `Esc` = clear |

---

## 4. Visual Design Principles

- **Light theme** — opposite of dark dashboard, easier for cashier in bright environment
- **Large touch targets** — minimum 44×44px for all interactive elements
- **Total always visible** — right panel sticky, never scrolls away
- **Color system**:
  - Stock OK: `#22c55e` (green-500)
  - Low stock: `#f59e0b` (amber-500)
  - Out of stock: `#ef4444` (red-500)
  - Primary action: `#3b82f6` (blue-500)
  - Background: `#f8fafc` (slate-50)
- **Typography**: Inter, total = 32px bold, product names = 14px medium
- **No nested menus** — everything on one screen

---

## 5. File Structure

```
apps/pos-web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                    ← entry point
│   ├── App.tsx                     ← root with auth/register gates
│   ├── index.css                   ← POS design tokens (light theme)
│   ├── index.html
│   │
│   ├── app/
│   │   ├── AppProviders.tsx        ← context providers wrapper
│   │   └── guards/
│   │       ├── AuthGuard.tsx       ← redirect to /login if no session
│   │       └── RegisterGuard.tsx   ← redirect to /register if no active session
│   │
│   ├── routes/
│   │   └── index.tsx               ← route tree (react-router-dom)
│   │
│   ├── store/
│   │   ├── auth.store.ts           ← cashier session (zustand)
│   │   ├── cart.store.ts           ← cart items, totals (zustand)
│   │   ├── register.store.ts       ← active register session (zustand)
│   │   └── index.ts                ← re-exports
│   │
│   ├── services/
│   │   ├── api.ts                  ← typed API client (fetch)
│   │   └── realtime.ts             ← socket.io-client hook
│   │
│   ├── hooks/
│   │   ├── useProducts.ts          ← catalog with search + filter
│   │   ├── useRegister.ts          ← register session management
│   │   └── useRealtimeSync.ts      ← socket events → store updates
│   │
│   ├── components/
│   │   └── layout/
│   │       ├── PosShell.tsx        ← 3-panel layout wrapper
│   │       ├── TopBar.tsx          ← store name, cashier, clock, status
│   │       ├── BottomBar.tsx       ← stock alerts, sync status, shortcuts
│   │       ├── ProductRail.tsx     ← left panel: search + product grid
│   │       ├── CartPanel.tsx       ← center panel: cart items
│   │       └── PaymentDrawer.tsx   ← right panel: payment capture
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx       ← email + password form
│   │   │   └── useAuth.ts          ← login/logout logic
│   │   │
│   │   ├── register/
│   │   │   ├── RegisterGatePage.tsx ← open register form
│   │   │   ├── CloseRegisterModal.tsx
│   │   │   └── SuspendResumeButton.tsx
│   │   │
│   │   ├── catalog/
│   │   │   ├── ProductCard.tsx     ← single product card with add button
│   │   │   ├── ProductGrid.tsx     ← grid of ProductCard
│   │   │   ├── SearchBar.tsx       ← search input with clear
│   │   │   └── CategoryChips.tsx   ← All / Makanan / Minuman / Snack
│   │   │
│   │   ├── cart/
│   │   │   ├── CartItem.tsx        ← single cart row with qty adjuster
│   │   │   ├── CartList.tsx        ← list of CartItem
│   │   │   └── CartSummary.tsx     ← subtotal + clear button
│   │   │
│   │   ├── checkout/
│   │   │   ├── PaymentMethodSelector.tsx
│   │   │   ├── CashInput.tsx       ← received amount + change calc
│   │   │   ├── PayButton.tsx       ← confirm payment CTA
│   │   │   ├── SuccessScreen.tsx   ← receipt summary after payment
│   │   │   └── useCheckout.ts      ← checkout flow logic
│   │   │
│   │   ├── orders/
│   │   │   ├── RecentOrdersDrawer.tsx ← slide-in recent transactions
│   │   │   └── OrderStatusBadge.tsx
│   │   │
│   │   └── inventory/
│   │       └── StockAlertBar.tsx   ← bottom bar stock warnings
│   │
│   └── pages/
│       ├── LoginPage.tsx           ← /login
│       ├── RegisterGatePage.tsx    ← /register
│       └── PosPage.tsx             ← / (main POS screen)
```

---

## 6. API Endpoints Used

All endpoints already exist in `apps/api`. No new backend work needed for MVP.

| Endpoint                                       | Used by                      |
| ---------------------------------------------- | ---------------------------- |
| `POST /api/auth/login`                         | LoginPage                    |
| `GET /api/auth/me`                             | AuthGuard                    |
| `GET /api/products`                            | ProductGrid                  |
| `GET /api/inventory/low-stock`                 | StockAlertBar                |
| `GET /api/inventory/out-of-stock`              | ProductCard (disabled state) |
| `GET /api/register/active`                     | RegisterGuard, TopBar        |
| `POST /api/register/open`                      | RegisterGatePage             |
| `POST /api/register/close`                     | CloseRegisterModal           |
| `POST /api/register/:id/suspend`               | SuspendResumeButton          |
| `POST /api/register/:id/resume`                | SuspendResumeButton          |
| `POST /api/chatbot/cart` (via CheckoutService) | useCheckout                  |
| `POST /api/payments`                           | useCheckout                  |
| `POST /api/payments/confirm`                   | useCheckout                  |
| `GET /api/orders`                              | RecentOrdersDrawer           |
| `PATCH /api/orders/:id/status`                 | RecentOrdersDrawer           |

### Note on checkout flow

POS web does NOT use the bot's cart (`/api/chatbot/cart`).
It builds the order directly:

1. Cart state is local (Zustand)
2. On payment confirm → `POST /api/payments` → `POST /api/payments/confirm`
3. Order is created via `CheckoutService` internally

**Recommended: add `POST /api/pos/checkout`** — a thin controller that accepts cart items + payment method and calls `CheckoutService.createOrderFromCart()` directly. This keeps POS flow clean without going through the bot cart.

---

## 7. State Management (Zustand)

### `auth.store.ts`

```typescript
interface AuthState {
  user: { actor: string; email: string; role: string; storeId: string } | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### `cart.store.ts`

```typescript
interface CartState {
  items: CartItem[]; // { productId, name, price, qty, stock }
  addItem: (product) => void;
  removeItem: (productId) => void;
  updateQty: (productId, qty) => void;
  clear: () => void;
  subtotal: number; // computed
  itemCount: number; // computed
}
```

### `register.store.ts`

```typescript
interface RegisterState {
  session: RegisterSession | null; // from GET /api/register/active
  status: "open" | "suspended" | "closed" | "none";
  refresh: () => Promise<void>;
}
```

---

## 8. To-Do List (Implementation Order)

### Phase 1 — Setup & Auth (Day 1)

- [ ] `package.json` — add react-router-dom, zustand, lucide-react, socket.io-client
- [ ] `tsconfig.json` — TypeScript config
- [ ] `vite.config.ts` — proxy `/api` → `localhost:3000`
- [ ] `index.html` + `index.css` — light theme design tokens
- [ ] `src/services/api.ts` — typed API client
- [ ] `src/store/auth.store.ts` — Zustand auth store
- [ ] `src/features/auth/LoginPage.tsx` — login form
- [ ] `src/app/guards/AuthGuard.tsx` — redirect if no token
- [ ] `src/routes/index.tsx` — react-router-dom route tree
- [ ] `src/App.tsx` — root with providers + routes
- [ ] `src/main.tsx` — entry point

### Phase 2 — Register Gate (Day 1–2)

- [ ] `src/store/register.store.ts` — Zustand register store
- [ ] `src/hooks/useRegister.ts` — open/close/suspend/resume
- [ ] `src/features/register/RegisterGatePage.tsx` — open register form
- [ ] `src/app/guards/RegisterGuard.tsx` — redirect if no active session
- [ ] `src/features/register/CloseRegisterModal.tsx`
- [ ] `src/features/register/SuspendResumeButton.tsx`

### Phase 3 — POS Main Screen (Day 2–3)

- [ ] `src/components/layout/PosShell.tsx` — 3-panel layout
- [ ] `src/components/layout/TopBar.tsx` — store, cashier, clock, status
- [ ] `src/components/layout/BottomBar.tsx` — stock alerts, sync
- [ ] `src/features/catalog/SearchBar.tsx`
- [ ] `src/features/catalog/CategoryChips.tsx`
- [ ] `src/features/catalog/ProductCard.tsx` — with stock badge
- [ ] `src/features/catalog/ProductGrid.tsx`
- [ ] `src/hooks/useProducts.ts` — search + filter logic
- [ ] `src/components/layout/ProductRail.tsx` — left panel assembly

### Phase 4 — Cart (Day 3)

- [ ] `src/store/cart.store.ts` — Zustand cart store
- [ ] `src/features/cart/CartItem.tsx` — qty adjuster
- [ ] `src/features/cart/CartList.tsx`
- [ ] `src/features/cart/CartSummary.tsx`
- [ ] `src/components/layout/CartPanel.tsx` — center panel assembly

### Phase 5 — Checkout & Payment (Day 3–4)

- [ ] `src/features/checkout/PaymentMethodSelector.tsx`
- [ ] `src/features/checkout/CashInput.tsx` — received + change
- [ ] `src/features/checkout/PayButton.tsx`
- [ ] `src/features/checkout/useCheckout.ts` — checkout flow
- [ ] `src/features/checkout/SuccessScreen.tsx` — receipt
- [ ] `src/components/layout/PaymentDrawer.tsx` — right panel assembly
- [ ] **Backend**: `POST /api/pos/checkout` controller (optional but recommended)

### Phase 6 — Orders & Realtime (Day 4)

- [ ] `src/features/orders/RecentOrdersDrawer.tsx`
- [ ] `src/features/orders/OrderStatusBadge.tsx`
- [ ] `src/services/realtime.ts` — socket.io-client
- [ ] `src/hooks/useRealtimeSync.ts` — update cart/stock on events
- [ ] `src/features/inventory/StockAlertBar.tsx`
- [ ] `src/pages/PosPage.tsx` — assemble all panels

### Phase 7 — Polish & Build (Day 5)

- [ ] Keyboard shortcuts (F1 search, F2 pay, Esc clear)
- [ ] Responsive layout (tablet-friendly)
- [ ] Loading states and error handling
- [ ] `vite build` — production build
- [ ] Update `infra/docker/docker-compose.yml` for pos-web service

---

## 9. Expected Output Files

Total: **~35 files** to create.

```
apps/pos-web/
├── package.json                          ← UPDATE (add deps)
├── tsconfig.json                         ← CREATE
├── vite.config.ts                        ← CREATE
├── src/
│   ├── main.tsx                          ← UPDATE
│   ├── App.tsx                           ← CREATE
│   ├── index.css                         ← CREATE (light theme)
│   ├── index.html                        ← CREATE
│   ├── app/
│   │   ├── AppProviders.tsx              ← CREATE
│   │   └── guards/
│   │       ├── AuthGuard.tsx             ← CREATE
│   │       └── RegisterGuard.tsx         ← CREATE
│   ├── routes/
│   │   └── index.tsx                     ← CREATE
│   ├── store/
│   │   ├── auth.store.ts                 ← CREATE
│   │   ├── cart.store.ts                 ← CREATE
│   │   ├── register.store.ts             ← CREATE
│   │   └── index.ts                      ← CREATE
│   ├── services/
│   │   ├── api.ts                        ← CREATE
│   │   └── realtime.ts                   ← CREATE
│   ├── hooks/
│   │   ├── useProducts.ts                ← CREATE
│   │   ├── useRegister.ts                ← CREATE
│   │   └── useRealtimeSync.ts            ← CREATE
│   ├── components/layout/
│   │   ├── PosShell.tsx                  ← CREATE
│   │   ├── TopBar.tsx                    ← CREATE
│   │   ├── BottomBar.tsx                 ← CREATE
│   │   ├── ProductRail.tsx               ← CREATE
│   │   ├── CartPanel.tsx                 ← CREATE
│   │   └── PaymentDrawer.tsx             ← CREATE
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx             ← CREATE
│   │   │   └── useAuth.ts                ← CREATE
│   │   ├── register/
│   │   │   ├── RegisterGatePage.tsx      ← CREATE
│   │   │   ├── CloseRegisterModal.tsx    ← CREATE
│   │   │   └── SuspendResumeButton.tsx   ← CREATE
│   │   ├── catalog/
│   │   │   ├── ProductCard.tsx           ← CREATE
│   │   │   ├── ProductGrid.tsx           ← CREATE
│   │   │   ├── SearchBar.tsx             ← CREATE
│   │   │   └── CategoryChips.tsx         ← CREATE
│   │   ├── cart/
│   │   │   ├── CartItem.tsx              ← CREATE
│   │   │   ├── CartList.tsx              ← CREATE
│   │   │   └── CartSummary.tsx           ← CREATE
│   │   ├── checkout/
│   │   │   ├── PaymentMethodSelector.tsx ← CREATE
│   │   │   ├── CashInput.tsx             ← CREATE
│   │   │   ├── PayButton.tsx             ← CREATE
│   │   │   ├── SuccessScreen.tsx         ← CREATE
│   │   │   └── useCheckout.ts            ← CREATE
│   │   ├── orders/
│   │   │   ├── RecentOrdersDrawer.tsx    ← CREATE
│   │   │   └── OrderStatusBadge.tsx      ← CREATE
│   │   └── inventory/
│   │       └── StockAlertBar.tsx         ← CREATE
│   └── pages/
│       ├── LoginPage.tsx                 ← CREATE
│       ├── RegisterGatePage.tsx          ← CREATE
│       └── PosPage.tsx                   ← CREATE
```

### Backend (apps/api) — 1 optional file

```
apps/api/src/modules/pos/
├── pos.controller.ts    ← CREATE (POST /api/pos/checkout)
└── pos.module.ts        ← CREATE
```

---

## 10. Definition of Done

- [ ] `npm run dev` starts POS at `localhost:5174`
- [ ] Cashier can log in with email + password
- [ ] Register gate blocks access if no active session
- [ ] Products load and are searchable by name
- [ ] Category filter works
- [ ] Low stock / out of stock products show correct badges
- [ ] Add to cart works, qty adjustable
- [ ] Payment modal opens with correct total
- [ ] Cash change is calculated correctly
- [ ] Order is created in DB after payment confirm
- [ ] Success screen shows order ID and change
- [ ] Recent orders drawer shows today's transactions
- [ ] Realtime: new order from bot appears in recent orders
- [ ] `npm run build` produces clean dist
