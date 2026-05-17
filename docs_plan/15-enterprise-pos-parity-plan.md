# Lecrion Enterprise POS Parity Plan

Goal: evolve Lecrion POS from the current cashier checkout app into a robust multi-business operating layer comparable in discipline to mature systems such as Odoo POS, Mekari POS, majoo, and Moka, without trying to copy every feature at once.

Lecrion is not restaurant-only. The core platform must support many business fields: restaurant, cafe, retail store, fashion store, building materials, warehouse, logistics, shipping/vessel operations, service jobs, project-based sales, and other inventory or order-driven businesses. F&B features such as tables and KDS must be implemented as vertical modules on top of shared product, inventory, document, payment, and workflow primitives.

This plan is written for AI agents. Execute phases in order. Do not skip Phase 0 and Phase 1, because all advanced POS features depend on transaction, cashflow, stock, reporting, and realtime correctness.

## 0. Current Baseline

Current POS capabilities in this repo:

- Cashier auth and protected routes in `apps/pos-web`.
- Register open, close, suspend, resume.
- Product catalog search, inferred categories, stock badges.
- Zustand cart with quantity controls.
- Payment UI for `Cash`, `Transfer`, and `QRIS`.
- POS checkout via `POST /api/pos/checkout`.
- Separate payment create and payment confirm calls from frontend.
- Order, payment, cashflow, reports, bot, realtime modules in `apps/api`.
- Report snapshots in `report_snapshots`.
- Socket.IO live feed.
- WhatsApp bot ordering and reporting commands.

Known critical gaps:

- POS transaction is not atomic. Frontend creates order, records payment, then confirms payment in separate calls.
- POS checkout ignores selected payment method when creating `orders.payment_method`; it uses default config.
- POS sale does not write `cashflow_entries`, so register close expected cash can be wrong.
- POS dashboard overview reads cached projections that are not reliably rebuilt after payment confirmation.
- POS dashboard receives realtime events but does not reload report snapshots/orders on those events.
- POS socket auth uses an empty API key.
- Checkout idempotency key is based only on sender and product IDs, not quantities, totals, payment, session, or a client transaction ID.
- Product model is still the legacy `menu` table; no SKU, barcode, category column, variant, cost, tax, or recipe model.

## 1. Non-Negotiable Principles

Every POS feature must follow these rules:

1. One sale command must commit all core rows in one database transaction.
2. Sales must create or update:
   - order
   - order_items
   - payment rows
   - cashflow entry for cash movement when applicable
   - stock movement or stock_change_logs
   - audit log
   - outbox events
3. Dashboard numbers must update from committed state only.
4. Dashboard projections must be rebuildable and refreshable after important events.
5. Refunds, voids, and cancellations must create counter-entries. Do not delete business rows.
6. Cash register session is the anchor for shift-level reporting.
7. Stock cannot be treated as only `menu.stock` forever. Add a ledger path before adding advanced inventory features.
8. Frontend must not orchestrate multi-step business transactions when a single backend command can do it safely.
9. Bot and POS must share the same transaction services where possible.
10. Existing user changes must not be reverted. Keep each phase scoped.

## 2. Target Architecture

Target write path for a cashier sale:

```text
POS UI
  -> POST /api/pos/sales
    -> PosSalesService.createSale()
      -> validate register session is open
      -> validate product availability and prices
      -> calculate subtotal, discount, tax, service charge, total
      -> create order and order_items
      -> create payment rows
      -> confirm paid payments when tender is accepted
      -> create cashflow_entries for cash payments and cash adjustments
      -> decrement stock and write stock ledger rows
      -> write audit log
      -> write outbox events
    -> return sale receipt payload
  -> UI clears cart and shows receipt
  -> worker/API emits realtime events
  -> dashboard reloads affected projections
```

Target read path for POS dashboard:

```text
Realtime events:
  order.created
  payment.confirmed
  cashflow.income.recorded
  cashflow.expense.recorded
  register.opened
  register.closed
  stock.adjusted
  stock.low

On event:
  -> reload recent orders
  -> reload active register
  -> reload report snapshots
  -> refresh visible shift summary
```

## 3. Phase 0 - Stabilize Current POS Reporting Bug

Purpose: fix the immediate issue where cashier sales do not update POS dashboard overview numbers reliably.

### Backend Tasks

- Update `PaymentsService.confirmPayment()` in `apps/api/src/modules/payments/payments.service.ts`.
  - After payment confirmation transaction commits, trigger projection rebuild for affected reports.
  - Prefer injecting `ReadModelService` if module dependencies are clean.
  - If dependency cycle appears, emit an outbox event and let a worker/API listener rebuild projections.

- Add or emit canonical events:
  - `payment.confirmed`
  - `order.confirmed`
  - `cashflow.income.recorded` when cashflow is added in Phase 1

- Update `PosController.checkout()` in `apps/api/src/modules/pos/pos.controller.ts`.
  - Stop rebuilding projections immediately after order creation if the payment confirmation happens later.
  - Until Phase 1 replaces the flow, rebuild after final payment confirmation, not before.

### Frontend Tasks

- Update `apps/pos-web/src/pages/PosDashboardPage.tsx`.
  - On `order.created`, `order.confirmed`, `payment.confirmed`, `cashflow.income.recorded`, call:
    - `snapshots.reload()`
    - `orders.reload()`
    - `refresh()` from `useRegisterStore`
  - Keep existing polling as fallback.

- Update `apps/pos-web/src/services/realtime.ts`.
  - Send the same auth model as dashboard: JWT if available, otherwise `VITE_DASHBOARD_API_KEY`.
  - Join `dashboard` and `store:{storeId}` rooms.

- Align stock event names in POS dashboard.
  - Listen to `stock.low` and `stock.adjusted`, not only `stock.alert`.

### Acceptance Criteria

- Complete one POS sale.
- POS dashboard daily revenue changes without manual browser refresh.
- Recent orders changes without manual browser refresh.
- Payment method summary is at least refreshed after payment confirmation.
- Realtime connection works when `DASHBOARD_API_KEY` is configured.

## 4. Phase 1 - Atomic POS Sale Engine

Purpose: replace fragile frontend-orchestrated checkout with a single authoritative backend command.

### New Backend Service

Create:

- `apps/api/src/modules/pos/pos-sales.service.ts`

Recommended public method:

```ts
createSale(dto: CreatePosSaleDto, user: AuthUser): Promise<PosSaleReceipt>
```

DTO shape:

```ts
interface CreatePosSaleDto {
  clientSaleId: string;
  registerSessionId: number;
  storeId?: string;
  cashierId: string;
  customerName?: string;
  customerPhone?: string;
  orderType: "pickup" | "dine_in" | "delivery";
  items: Array<{
    productId: number;
    name?: string;
    qty: number;
    unitPrice?: number;
    note?: string;
  }>;
  payments: Array<{
    method: "Cash" | "Transfer" | "QRIS" | "GoPay" | string;
    amount: number;
    paidAmount?: number;
    reference?: string;
  }>;
  discountAmount?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  note?: string;
}
```

Receipt response:

```ts
interface PosSaleReceipt {
  saleId: string;
  orderId: number;
  receiptNumber: string;
  registerSessionId: number;
  cashierId: string;
  customerName: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  paidTotal: number;
  change: number;
  paymentMethods: string[];
  items: Array<{ productId: number; name: string; qty: number; unitPrice: number; lineTotal: number }>;
  createdAt: string;
}
```

### Transaction Rules

Inside one `prisma.$transaction`:

- Verify register session exists and status is `open`.
- Load products by IDs.
- Verify each item qty is positive integer.
- Verify stock is enough unless a later setting explicitly allows negative stock.
- Use DB price by default. Only allow overridden price if a future permission allows it.
- Create order with correct `payment_method`.
- Create order items.
- Create payment row per tender line.
- Mark payment as paid immediately if tender accepted.
- Update order status to `confirmed` or `paid` consistently.
- Decrement stock.
- Create stock movement/log per item.
- Create cashflow entry for cash payment.
- Write outbox events:
  - `order.created`
  - `payment.confirmed`
  - `cashflow.income.recorded` for cash
  - `stock.adjusted` or future `stock.sold`
- Write audit record.
- Save idempotency key by `clientSaleId`.

### Frontend Tasks

- Update `apps/pos-web/src/features/checkout/useCheckout.ts`.
  - Replace three calls (`posCheckout`, `recordPayment`, `confirmPayment`) with one call: `createPosSale`.
  - Generate `clientSaleId` in frontend and keep it until sale succeeds or fails.
  - Send active `registerSessionId`.

- Update `apps/pos-web/src/services/api.ts`.
  - Add `createPosSale()`.
  - Keep old APIs for dashboard/payment admin screens, but POS sale flow should not use them.

### Acceptance Criteria

- If sale succeeds, order, payment, cashflow, stock log, audit, and outbox rows exist.
- If any part fails, no partial sale is committed.
- Retrying the same `clientSaleId` returns the same receipt or a clear duplicate result.
- Cash register expected cash increases after cash sale.
- Non-cash sale appears in payment reports but does not increase cash drawer.

## 5. Phase 2 - Shift, Register, and Cashier Accounting

Purpose: make Lecrion shift reports credible, similar to majoo's cashier report and Odoo's cash control.

### Backend Tasks

- Add shift summary endpoint:
  - `GET /api/register/sessions/:id/summary`

Response should include:

- opening cash
- cash sales
- non-cash sales by method
- cash in
- cash out
- refunds
- expected cash
- counted cash
- variance
- transaction count
- sold products summary
- first sale time
- last sale time
- cashier ID

- Add cash adjustment endpoint:
  - `POST /api/register/sessions/:id/cash-adjustments`

Supported adjustment types:

- `cash_in`
- `cash_out`
- `expense`
- `refund`

- Update close register modal to show system expected cash before close.
- Add close register validation:
  - cannot close if no active session
  - cannot close suspended session unless resumed or explicitly allowed
  - counted cash required
  - variance recorded

### Frontend Tasks

- Update `CloseRegisterModal`.
  - Display expected cash, counted cash, variance live.
  - Show payment breakdown.
  - Show product sold summary.

- Add POS dashboard shift panel:
  - current session
  - cash drawer expected
  - cash sales
  - QRIS/Transfer totals
  - transaction count
  - variance after counted cash

### Acceptance Criteria

- A cash sale changes active session expected cash.
- A QRIS sale changes sales revenue but not expected cash.
- Cash out decreases expected cash.
- Register close stores counted cash and variance.
- Shift summary can be printed/exported later from one endpoint.

## 6. Phase 3 - Product Catalog and Inventory Foundation

Purpose: move from legacy `menu` product table toward POS-grade catalog and stock management.

### Database Tasks

Add fields or new tables carefully with migration:

- product SKU
- barcode
- category
- unit
- cost price/HPP
- selling price
- active flag
- taxable flag
- image
- product type: `stocked`, `service`, `bundle`, `modifier`
- store/location stock if multi-store is enabled

Recommended new tables:

- `product_categories`
- `product_variants`
- `stock_movements`
- `stock_balances`
- `stock_opnames`
- `stock_transfers`
- `product_barcodes`

Keep compatibility with `menu` until migration is complete.

### Backend Tasks

- Create `InventoryLedgerService`.
- Every stock change must write stock movement:
  - sale
  - restock
  - adjustment
  - waste
  - refund
  - transfer
  - opname

- Add APIs:
  - `POST /api/inventory/adjustments`
  - `POST /api/inventory/restocks`
  - `POST /api/inventory/opnames`
  - `GET /api/inventory/movements`
  - `GET /api/products/:id/movements`

### Frontend Tasks

- Add barcode input support in POS search.
- Add product detail drawer:
  - stock
  - SKU/barcode
  - price
  - category
  - recent movement

- Add inventory page improvements in `apps/pos-web` and/or `apps/dashboard`:
  - stock adjustment
  - restock
  - movement history
  - low stock threshold

### Acceptance Criteria

- Every sale creates stock movement rows.
- Manual stock edits no longer only update final stock; they write an adjustment movement.
- Product search works by name, SKU, and barcode.
- Stock movement history explains why stock changed.

## 7. Phase 4 - Advanced Payment, Discount, Tax, and Receipt

Purpose: add realistic multi-business checkout controls for retail, F&B, service, warehouse issue, and project/job order flows.

### Backend Tasks

- Support multiple payment lines per sale.
- Add discount model:
  - line discount amount/percent
  - order discount amount/percent
  - reason
  - optional manager approval flag

- Add tax/service charge config:
  - store-level tax rate
  - service charge rate
  - inclusive/exclusive pricing setting

- Add receipt numbering:
  - per store
  - per register session
  - date prefix
  - collision-safe sequence

- Add receipt endpoint:
  - `GET /api/pos/sales/:orderId/receipt`

Receipt must include:

- store info
- receipt number
- cashier
- session ID
- item lines
- subtotal
- discount
- tax
- service charge
- payment breakdown
- paid amount
- change
- footer text

### Frontend Tasks

- Add cart-level discount.
- Add line-level discount.
- Add tax/service-charge display.
- Add split payment UI.
- Add receipt success screen with print and WhatsApp receipt placeholders.
- Add browser print stylesheet for receipts.

### Acceptance Criteria

- A sale can be paid with Cash + QRIS.
- Discount affects total and receipt.
- Tax/service charge affects total and report.
- Receipt can be printed from browser.
- Receipt can be reopened from recent order details.

## 8. Phase 5 - Void, Refund, Return, and Manager Approval

Purpose: support real POS correction flows without corrupting reports.

### Backend Tasks

Add endpoints:

- `POST /api/pos/orders/:id/void`
- `POST /api/pos/orders/:id/refund`
- `POST /api/pos/orders/:id/return-items`

Rules:

- Void allowed only before payment finalization or within a strict policy window.
- Refund creates negative payment/cashflow entries.
- Return creates stock-in movement for returned items.
- Order status becomes `cancelled`, `refunded`, or `partially_refunded`.
- Manager approval required above configured amount or after configured time window.
- Original rows remain immutable.

### Frontend Tasks

- Add action menu in recent orders:
  - void
  - refund
  - return item
  - reprint receipt

- Add approval modal:
  - manager PIN/password
  - reason
  - audit trail

### Acceptance Criteria

- Refund reverses revenue and cashflow correctly.
- Returned stock increases inventory.
- Dashboard revenue excludes or subtracts refunded amounts according to policy.
- Audit log records who approved and why.

## 9. Phase 6 - Multi-Business Operating Foundation

Purpose: make Lecrion useful beyond restaurants and cafes. This phase creates the shared business primitives needed by retail stores, warehouses, building material shops, fashion stores, service businesses, logistics operations, shipping/vessel operations, and F&B verticals.

Do not hardcode restaurant concepts into the core domain. Tables, KDS, and kitchen tickets belong to an F&B vertical module after the shared foundation exists.

### Phase 6A - Product and Catalog Generalization

Add product metadata that works across business types:

- SKU
- barcode
- category
- brand
- unit of measure
- cost price/HPP
- selling price
- active flag
- taxable flag
- image
- product type:
  - `stocked`
  - `non_stock`
  - `service`
  - `bundle`
  - `material`
  - `menu_item`
  - `rental`
  - `serialized`

Add compatibility with the current `menu` table until a full product migration is safe.

Recommended tables:

- `product_categories`
- `product_units`
- `product_variants`
- `product_barcodes`
- `product_attributes`
- `product_bundles`

Acceptance criteria:

- Product search works by name, SKU, barcode, and category.
- A product can be marked as stock-tracked or non-stock/service.
- Variants can represent size/color or similar retail attributes.
- Existing POS menu products still work.

### Phase 6B - Inventory Location Foundation

Add stock structure that can support stores, warehouses, stock rooms, project sites, vessels, and yards.

Recommended concepts:

- location type:
  - `store`
  - `warehouse`
  - `bin`
  - `project_site`
  - `vessel`
  - `vehicle`
  - `supplier`
  - `customer`

- stock balance by product and location
- stock movement by source and destination
- stock transfer
- goods receipt
- stock issue
- stock opname
- batch/lot tracking where needed
- serial number tracking where needed
- unit conversion for materials and wholesale

Recommended APIs:

- `GET /api/locations`
- `POST /api/locations`
- `GET /api/inventory/balances`
- `POST /api/inventory/transfers`
- `POST /api/inventory/receipts`
- `POST /api/inventory/issues`
- `POST /api/inventory/opnames`

Acceptance criteria:

- A sale can decrement stock from the active store/location.
- A warehouse transfer moves stock between locations with ledger rows.
- Manual adjustments and returns are location-aware.
- Stock history explains source, destination, operator, and reason.

### Phase 6C - Document Workflow Foundation

Create shared business documents that can represent many fields:

- quotation
- sales order
- invoice/payment
- delivery note
- goods receipt
- stock issue
- return document
- service/job order
- project order

Recommended fields:

- document number
- document type
- status
- customer/vendor/project reference
- source location
- destination location
- line items
- totals
- linked payments
- linked stock movements
- audit history

Recommended statuses:

- `draft`
- `confirmed`
- `in_progress`
- `partially_fulfilled`
- `fulfilled`
- `paid`
- `cancelled`
- `refunded`

Acceptance criteria:

- POS sale remains a fast path, but can be linked to a general document model later.
- Non-POS workflows such as warehouse issue or service order can reuse products, inventory, payments, and audit.
- Reports can group business activity by document type.

### Phase 6D - Vertical Modules

After Phase 6A-6C, add optional vertical workflows:

- F&B:
  - dining areas
  - tables
  - kitchen tickets
  - kitchen display system
  - item preparation statuses

- Retail/fashion:
  - size/color variants
  - barcode labels
  - outlet stock
  - exchange workflow

- Building materials:
  - unit conversion
  - delivery scheduling
  - project/customer job reference
  - wholesale price tiers

- Warehouse/logistics:
  - receiving
  - picking
  - packing
  - dispatch
  - bin locations

- Shipping/vessel/service operations:
  - vessel/job reference
  - stock issue to vessel/project
  - maintenance/service orders
  - materials usage tracking

Acceptance criteria:

- Vertical modules do not break the generic retail POS flow.
- Vertical-specific screens use shared catalog, inventory, document, payment, and audit primitives.
- Business type can be enabled per store/company configuration.

## 10. Phase 7 - Customer, Loyalty, Promo, and CRM

Purpose: add customer-facing business tools similar to mature POS products.

### Database Tasks

Add:

- `customers`
- `customer_points`
- `loyalty_programs`
- `promotions`
- `promotion_rules`
- `vouchers`

### Backend Tasks

- Customer lookup by phone/name.
- Attach customer to sale.
- Promotion engine:
  - item discount
  - order discount
  - bundle price
  - buy X get Y
  - happy hour/date range

- Loyalty:
  - earn points by sale amount
  - redeem points as discount

### Frontend Tasks

- Customer search/add drawer.
- Promo/voucher apply UI.
- Loyalty balance display.
- Customer purchase history.

### Acceptance Criteria

- Sale can be linked to customer.
- Promo affects total and receipt.
- Loyalty points are earned after paid sale.
- Customer history shows previous receipts.

## 11. Phase 8 - Offline Mode and Sync

Purpose: support real store conditions where internet or API can fail.

### Frontend Tasks

- Add IndexedDB local store:
  - products cache
  - active session cache
  - pending sales queue
  - receipt cache

- Add offline sale flow:
  - generate local receipt number
  - prevent products unknown to local cache
  - queue sale with `clientSaleId`
  - sync when online

- Add sync status UI:
  - online
  - offline
  - pending sync count
  - sync failed

### Backend Tasks

- Make `POST /api/pos/sales` idempotent by `clientSaleId`.
- Add conflict result types:
  - accepted
  - duplicate
  - rejected_stock_changed
  - rejected_register_closed
  - needs_manual_review

- Add sync review endpoint for failed offline sales.

### Acceptance Criteria

- Cashier can create offline sale from cached products.
- Sale syncs once API is available.
- Duplicate sync does not double-charge or double-decrement stock.
- Sync conflict is visible and actionable.

## 12. Phase 9 - Multi-Store, Roles, Security, and Audit Hardening

Purpose: make POS safe for multiple outlets, users, and permissions.

### Database Tasks

- Add role column or role mapping for `users`.
- Add proper store/tenant columns where currently missing:
  - products/menu
  - carts
  - orders if needed
  - stock balances
  - settings

### Backend Tasks

- Enforce store scope in all POS, catalog, inventory, register, report endpoints.
- Add permission checks:
  - open register
  - close register
  - discount
  - price override
  - refund
  - void
  - stock adjustment
  - report access

- Add manager PIN/password approval service.
- Add audit views by store/session/operator.

### Frontend Tasks

- Hide restricted actions by role.
- Require manager approval for sensitive actions.
- Add audit trail screen.

### Acceptance Criteria

- Cashier cannot access another store's sales.
- Cashier cannot refund or discount beyond permission.
- Every sensitive action appears in audit logs.

## 13. Phase 10 - Owner Analytics and WhatsApp Reporting

Purpose: move beyond simple overview into operational intelligence.

### Backend Tasks

Expand report projections:

- hourly sales
- shift summaries
- cashier performance
- payment method mix
- product category sales
- gross margin if HPP exists
- stock movement summary
- void/refund report
- promo performance
- customer repeat rate

Add scheduled WhatsApp summaries:

- hourly sales
- close register report
- low stock report
- daily close report

### Frontend Tasks

- POS dashboard:
  - today sales
  - current shift sales
  - payment breakdown
  - top products
  - alerts

- Admin dashboard:
  - cashier report
  - inventory report
  - refund/void report
  - gross margin report

### Acceptance Criteria

- Owner can see sales by hour and cashier.
- Close register can generate a WhatsApp-ready summary.
- Reports reconcile with orders/payments/cashflow entries.

## 14. Phase 11 - Hardware and Operational Polish

Purpose: finish the practical POS experience.

### Hardware/UX Targets

- Receipt printer via browser print first.
- Barcode scanner as keyboard input first.
- Cash drawer trigger later, behind settings.
- Customer display later, via separate route/window.
- QRIS/EDC integration as provider adapters.

### Frontend Polish

- Keyboard shortcuts:
  - F1 focus search
  - F2 pay
  - F3 hold order
  - F4 recent orders
  - Esc close modal or clear pending action

- Touch-friendly layout.
- Fast product search.
- Hold/resume multiple carts.
- Product favorites/pinned items.
- Clear loading and failure states.

### Acceptance Criteria

- Cashier can operate most common flow with keyboard or touch.
- Receipt print works from success screen and order history.
- Held orders can be resumed without losing items.

## 15. Phase 12 - Enterprise UI Polish and Product Experience

Purpose: make Lecrion feel like an enterprise-ready POS after the software logic and business logic are correct. This phase must not start before Milestone 4 is stable, because polished UI on top of broken sale/cashflow/reporting logic will hide defects instead of solving them.

### Entry Criteria

Do not start this phase until these are true:

- Atomic POS sale works.
- Payment, cashflow, stock, audit, and outbox rows are written correctly.
- POS dashboard updates after cashier sale.
- Register close report reconciles cash and non-cash sales.
- Refund/void rules exist or are at least designed with stable endpoints.
- Core API and frontend builds pass.

### UI Library Direction

Preferred stack:

- `@tanstack/react-query` for server state, cache invalidation, loading/error states, and realtime-triggered refetch.
- `react-hook-form` plus `zod` for robust form validation.
- `@tanstack/react-table` for dense enterprise tables.
- `cmdk` or equivalent command palette for fast cashier/admin actions.
- `sonner` or equivalent toast library for non-blocking feedback.
- `vaul` or Radix Dialog/Drawer primitives for drawers and modals.
- `lucide-react` remains the icon library.
- Optional charting: `recharts` for dashboard charts if current charts are insufficient.

Avoid introducing a heavy UI framework that fights the current CSS unless there is a clear migration plan. If using shadcn/Radix-style components, keep components local and theme them with Lecrion design tokens.

### Design Principles

- POS is an operational tool, not a landing page.
- Prioritize clarity, speed, and error prevention over decoration.
- Use dense but readable layouts.
- Make totals, register state, sync state, and payment state always visible.
- Use color semantically:
  - green: success/paid/stock ok
  - amber: warning/low stock/pending
  - red: error/out of stock/void/refund risk
  - blue: primary action/current selection
  - neutral: inactive/history
- Every destructive or irreversible action needs confirmation and reason.
- Every long operation needs visible progress.
- Every stale or offline state needs a visible badge.
- No nested cards inside cards.
- Buttons should use icons where appropriate and concise labels.

### POS Cashier UI Tasks

- Redesign `apps/pos-web` around a stronger enterprise shell:
  - persistent top bar with store, register, cashier, online/offline, sync queue, clock
  - left catalog area with search, barcode input, category tabs, pinned products
  - center cart with line notes, discounts, quantity stepper, stock warnings
  - right payment panel with totals, tender lines, tax/discount/service charge, change
  - bottom action/status bar with shortcuts and current shift totals

- Add richer product cards:
  - SKU/barcode when available
  - stock badge
  - price
  - category
  - low-stock/out-of-stock visual state
  - quick-add quantity indicator

- Add cart line detail:
  - item note
  - line discount
  - price override indicator
  - stock availability warning
  - remove confirmation only when needed

- Add payment UX:
  - split tender cards
  - cash preset buttons
  - clear paid/remaining/change states
  - payment validation summary before confirmation
  - QRIS/Transfer reference input when needed

- Add receipt UX:
  - printable receipt preview
  - reprint action
  - WhatsApp receipt placeholder
  - compact success screen that returns cashier to next transaction quickly

- Add recent orders drawer polish:
  - filter by status/payment/cashier/date
  - expandable receipt details
  - refund/void/reprint actions
  - status timeline

### POS Dashboard UI Tasks

- Redesign `PosDashboardPage` into operational panels:
  - current shift status
  - today sales
  - current shift sales
  - cash drawer expected
  - payment method breakdown
  - active/open orders
  - low stock alerts
  - realtime event feed

- Use data freshness indicators:
  - last updated timestamp
  - realtime connected/disconnected
  - pending sync count
  - projection rebuilding/loading state

- Add drill-down actions:
  - click revenue card -> order list filtered to today
  - click cash drawer -> shift summary
  - click low stock -> inventory filtered low stock
  - click payment method -> payment report

### Admin Dashboard UI Tasks

- Normalize tables with `@tanstack/react-table`:
  - sortable columns
  - filters
  - density toggle
  - column visibility
  - pagination
  - export hooks where appropriate

- Upgrade dashboard pages:
  - Orders: status tabs, payment filters, action menu, order detail drawer.
  - Inventory: SKU/barcode/category filters, stock movement drawer, adjustment modal.
  - Cashflow: register sessions, cash in/out, variance highlighting, shift close report.
  - Bot overview: clearer KPI cards, command usage, failed webhook/LLM health states.
  - Live feed: event grouping, severity, store/session filters.
  - LLM console: tool-call visibility, redacted context preview, role badge.

### Interaction and State Feedback

- Replace blocking `alert()` and `confirm()` with app modals/toasts.
- Add optimistic UI only where rollback is safe.
- Use React Query invalidation on:
  - sale created
  - payment confirmed
  - register opened/closed
  - stock adjusted
  - refund/void completed

- Define standard states for every data panel:
  - loading
  - empty
  - error
  - stale
  - offline
  - refreshing

### Accessibility and Keyboard

- Ensure all POS actions can be reached by keyboard.
- Keep visible focus states.
- Add shortcuts help drawer.
- Required shortcuts:
  - F1 search
  - F2 payment
  - F3 hold/resume
  - F4 recent orders
  - F8 open cash drawer adjustment
  - Esc close modal or cancel current transient state

### Visual QA

Before marking this phase complete:

- Run desktop and tablet viewport checks.
- Verify no overlapping text in:
  - product cards
  - cart lines
  - payment buttons
  - summary cards
  - tables
  - drawers/modals

- Verify long product names and large totals.
- Verify empty catalog, empty cart, no active register, offline mode, low stock, out-of-stock, failed checkout.
- Use Browser/Playwright screenshots for POS cashier, POS dashboard, admin dashboard key pages.

### Acceptance Criteria

- POS cashier can understand current register, cart, payment, sync, and stock state without leaving the screen.
- Dashboard cards are actionable, not just decorative.
- All important actions show success/error feedback.
- Tables are filterable and usable with realistic data volume.
- UI looks consistent across POS and dashboard while preserving their different use cases.
- No business logic is moved into the UI just for presentation.
- Builds pass after UI library additions.

## 16. Suggested Implementation Order by Agent

Use one agent per phase or per bounded workstream. Do not split a single transaction service across many agents.

### Agent A - Backend Transaction Core

Owns:

- `apps/api/src/modules/pos/*`
- `apps/api/src/modules/checkout/*` only where needed
- `apps/api/src/modules/payments/*` only where needed
- `apps/api/src/modules/cashflow/*` only where needed
- tests for sale transaction

First task:

- Implement Phase 1 atomic `PosSalesService`.

### Agent B - POS Frontend Flow

Owns:

- `apps/pos-web/src/features/checkout/*`
- `apps/pos-web/src/services/api.ts`
- `apps/pos-web/src/components/layout/PaymentDrawer.tsx`
- `apps/pos-web/src/pages/PosDashboardPage.tsx`

First task:

- Replace multi-call checkout with `createPosSale()`.

### Agent C - Reporting and Realtime

Owns:

- `apps/api/src/modules/reports/*`
- `apps/api/src/infrastructure/realtime/*`
- `libs/realtime/*`
- `apps/worker/src/processors/*`
- `apps/pos-web/src/services/realtime.ts`
- `apps/dashboard/src/hooks/useSocket.ts`

First task:

- Ensure payment/sale events rebuild or refresh projections and dashboard reloads on events.

### Agent D - Inventory Ledger

Owns:

- `apps/api/src/modules/inventory/*`
- `apps/api/src/modules/catalog/*`
- Prisma migrations for stock/product metadata
- inventory screens

First task:

- Add stock movement ledger while preserving current `menu` compatibility.

### Agent I - Multi-Business Product and Location Foundation

Owns:

- `prisma/schema.prisma` and migrations for Phase 6 only
- `apps/api/src/modules/catalog/*`
- `apps/api/src/modules/inventory/*`
- new modules for locations/documents if created
- dashboard/POS product and inventory screens only where needed

First task:

- Implement Phase 6A product/catalog generalization and Phase 6B location-aware inventory foundation without adding F&B-specific tables first.

### Agent V - Vertical Workflow Modules

Owns:

- optional vertical modules after Phase 6A-6C are stable
- F&B tables/KDS, retail variants UX, warehouse picking, service/job/vessel screens

First task:

- Add one vertical module at a time using shared product, inventory, document, payment, and audit primitives.

## 17. Testing Strategy

### API Tests

Add tests for:

- sale success
- sale insufficient stock
- duplicate `clientSaleId`
- cash sale writes cashflow
- non-cash sale does not increase expected cash
- register closed rejects sale
- payment method stored correctly
- stock decremented correctly
- projection rebuild or event emitted after sale
- refund reverses revenue/cash/stock

### Frontend Tests or Manual QA

Minimum manual QA per phase:

- login
- open register
- sale with cash exact amount
- sale with cash and change
- sale with QRIS
- sale with insufficient stock
- dashboard updates after sale
- close register variance
- recent order detail and receipt

### Build Verification

Run after each implementation phase:

```bash
npm run build:api
npm --prefix apps/pos-web run build
npm --prefix apps/dashboard run build
```

If tests exist:

```bash
npm --prefix apps/api test
```

## 18. Release Milestones

### Milestone 1 - Correct POS

Includes Phase 0 and Phase 1.

Outcome:

- Sales are atomic.
- Dashboard numbers update.
- Payment method is correct.
- Register cash is correct for cash sales.

### Milestone 2 - Trustworthy Shift Close

Includes Phase 2.

Outcome:

- Shift close report is useful and auditable.
- Cash variance is meaningful.

### Milestone 3 - Inventory-Ready POS

Includes Phase 3.

Outcome:

- Stock history is explainable.
- SKU/barcode path is ready.

### Milestone 4 - Modern Checkout

Includes Phase 4 and Phase 5.

Outcome:

- Discounts, taxes, split payments, receipts, refunds, and voids work.

### Milestone 5 - Multi-Business Foundation

Includes Phase 6 and Phase 7.

Outcome:

- Lecrion supports generic product types, SKU/barcode/category, location-aware stock, shared business documents, customers, loyalty, and promo workflows.
- F&B tables/KDS, warehouse picking, retail variants, building material delivery, and vessel/project workflows are optional vertical modules built on the shared foundation.

### Milestone 6 - Operational Maturity

Includes Phase 8 through Phase 11.

Outcome:

- Offline mode, multi-store roles, analytics, WhatsApp reporting, and hardware polish.

### Milestone 7 - Enterprise Product Experience

Includes Phase 12.

Outcome:

- Lecrion feels polished, informative, fast, and ready for real cashier/admin use after the core business logic is already trustworthy.

## 19. Immediate Next Work

Start with these exact tasks:

1. Fix POS dashboard reload on realtime events.
2. Fix POS socket auth.
3. Add `PosSalesService.createSale()`.
4. Add `POST /api/pos/sales`.
5. Replace POS frontend checkout with one atomic sale call.
6. Write cashflow entry for cash sale.
7. Use selected POS payment method in order and payment records.
8. Rebuild or refresh projections after sale/payment confirmation.
9. Add API tests for the above.

Do not start discounts, receipts, refunds, vertical modules, loyalty, or offline mode until these are done.
