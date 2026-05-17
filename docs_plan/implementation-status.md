# Lecrion Implementation Status

_Updated: 2026-05-15_

## Phase Status Summary

| Phase                               | Status     | Notes                                                                                                                           |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Stabilize Reporting Bug         | ✅ Selesai | Dashboard reload on realtime events, socket auth fixed                                                                          |
| 1 — Atomic POS Sale Engine          | ✅ Selesai | `PosSalesService.createSale()`, single `prisma.$transaction`, idempotency                                                       |
| 2 — Shift & Register Accounting     | ✅ Selesai | `getSessionSummary()`, cash adjustments, expected cash formula                                                                  |
| 3 — Inventory Foundation            | ✅ Selesai | `InventoryLedgerService`, stock_change_logs, inventory_stock_balances                                                           |
| 4 — Payment, Discount, Tax, Receipt | ✅ Selesai | `PosCalculationService`, split payment, receipt numbering                                                                       |
| 5 — Void, Refund, Return, Approval  | ✅ Selesai | `PosCorrectionsService`, `PosApprovalService`, manager PIN                                                                      |
| 6A — Product Generalization         | ✅ Selesai | `product_categories`, `product_variants`, `product_barcodes`, barcode scanner UI                                                |
| 6B — Inventory Locations            | ✅ Selesai | `inventory_locations`, `inventory_stock_balances`, location-aware stock                                                         |
| 6C — Document Workflow              | ✅ Selesai | `OperationsService`, purchase_order/goods_receipt/stock_transfer/stock_adjustment                                               |
| 6D — Vertical Modules (F&B)         | ✅ Selesai | `dining_areas`, `dining_tables`, `kitchen_tickets`, KDS page, FnbModule                                                         |
| 7 — Customer, Loyalty, Promo        | ✅ Selesai | `customers`, `loyalty_programs`, `customer_points`, `promotions`, `vouchers`, CustomerDrawer, PromoInput, post-sale earn points |
| 8 — Offline Mode                    | ❌ Belum   | IndexedDB sync, offline sale queue                                                                                              |
| 9 — Multi-store RBAC                | ⚠️ Parsial | store_id ada di semua tabel, JWT/roles ada, per-store permission enforcement belum fully hardened                               |
| 10 — Owner Analytics                | ⚠️ Parsial | POS reports ada (6 endpoint), WhatsApp scheduled summaries belum                                                                |
| 11 — Hardware Polish                | ❌ Belum   | Keyboard shortcuts partial (F1/F2/Esc), receipt print ada, barcode scanner ada                                                  |
| 12 — Enterprise UI Polish           | ❌ Belum   | Belum dimulai                                                                                                                   |

## Milestones

| Milestone                                    | Status     |
| -------------------------------------------- | ---------- |
| 1 — Correct POS (Phase 0+1)                  | ✅ Selesai |
| 2 — Trustworthy Shift Close (Phase 2)        | ✅ Selesai |
| 3 — Inventory-Ready POS (Phase 3)            | ✅ Selesai |
| 4 — Modern Checkout (Phase 4+5)              | ✅ Selesai |
| 5 — Multi-Business Foundation (Phase 6+7)    | ✅ Selesai |
| 6 — Operational Maturity (Phase 8-11)        | ❌ Belum   |
| 7 — Enterprise Product Experience (Phase 12) | ❌ Belum   |

## Phase 6D Detail

### Backend (FnbModule)

- `dining_areas` table — area makan (Indoor, Outdoor, VIP)
- `dining_tables` table — meja dengan status available/occupied/reserved/cleaning
- `kitchen_tickets` table — tiket dapur per order
- `kitchen_ticket_items` table — item per tiket
- `TablesService` — CRUD areas dan tables, set status
- `KitchenService` — create ticket (idempotent by order_id), update ticket/item status, auto-advance ticket ke "ready" saat semua item ready
- `FnbController` — REST API `/api/fnb/areas`, `/api/fnb/tables`, `/api/fnb/kitchen/tickets`
- `orders.table_id` FK nullable — non-F&B orders tidak terpengaruh

### Frontend

- `apps/dashboard/src/pages/FnbTables.tsx` — dashboard page untuk manage meja dan KDS
- `apps/pos-web/src/pages/KdsPage.tsx` — KDS full-screen dark mode untuk dapur, auto-refresh 10 detik
- Route `/kds` di POS web

## Phase 7 Detail

### Backend (CustomersModule)

- `customers` table — profil pelanggan dengan tier (regular/silver/gold/platinum)
- `loyalty_programs` table — program poin (earn_rate, redeem_rate, min_redeem_points)
- `customer_points` table — ledger append-only poin per pelanggan
- `promotions` table — kampanye diskon (order_discount/item_discount/bundle/buy_x_get_y/happy_hour)
- `promotion_rules` table — aturan per-item/kategori untuk promosi
- `vouchers` table — kode voucher single/limited-use
- `CustomersService` — CRUD, search by name/phone, purchase history
- `LoyaltyService` — earn/redeem/adjust points, tier upgrade otomatis berdasarkan total spend
- `PromotionsService` — CRUD promosi/voucher, `calculateDiscount()`, `recordUsage()`
- `CustomersController` — 20+ endpoints di `/api/customers`
- `pos_sales.customer_id` FK nullable — existing sales tidak terpengaruh
- `pos_sales.promotion_id`, `voucher_code`, `loyalty_points_earned/redeemed` — Phase 7 fields

### Frontend POS

- `CustomerDrawer.tsx` — search/create customer, tampilkan tier dan point balance
- `PromoInput.tsx` — input kode voucher dengan validasi dan preview diskon
- `PaymentDrawer.tsx` — integrasi customer drawer dan promo input
- Post-sale loyalty earn — non-blocking, dipanggil setelah sale commit
- `SuccessScreen.tsx` — tampilkan loyalty points earned di struk

### Frontend Dashboard

- `apps/dashboard/src/pages/Customers.tsx` — 3 tab: Pelanggan, Promosi & Voucher, Loyalitas
- `apps/dashboard/src/pages/FnbTables.tsx` — 2 tab: Meja, Dapur (KDS)
- Sidebar: tambah "Pelanggan & CRM" dan "F&B / Dapur"
- Routes: `/customers` dan `/fnb`

## API Endpoints Added

### F&B (Phase 6D)

- `GET /api/fnb/areas` — list areas with tables
- `POST /api/fnb/areas` — create area
- `PATCH /api/fnb/areas/:id` — update area
- `DELETE /api/fnb/areas/:id` — deactivate area
- `GET /api/fnb/tables` — list tables (?available=true)
- `POST /api/fnb/tables` — create table
- `PATCH /api/fnb/tables/:id` — update table
- `PATCH /api/fnb/tables/:id/status` — set table status
- `GET /api/fnb/kitchen/tickets` — active tickets
- `GET /api/fnb/kitchen/tickets/:id` — single ticket
- `GET /api/fnb/kitchen/order/:orderId` — ticket by order
- `POST /api/fnb/kitchen/tickets` — create ticket for order
- `PATCH /api/fnb/kitchen/tickets/:id/status` — update ticket status
- `PATCH /api/fnb/kitchen/items/:itemId/status` — update item status

### Customers (Phase 7)

- `GET /api/customers` — list customers
- `GET /api/customers/search?q=` — search by name/phone
- `GET /api/customers/:id` — single customer
- `GET /api/customers/:id/history` — purchase history
- `GET /api/customers/:id/points` — point balance + history
- `POST /api/customers` — create customer
- `PATCH /api/customers/:id` — update customer
- `DELETE /api/customers/:id` — deactivate customer
- `GET /api/customers/loyalty/program` — active loyalty program
- `POST /api/customers/loyalty/program` — create/replace program
- `POST /api/customers/loyalty/:id/earn` — earn points post-sale
- `POST /api/customers/loyalty/:id/redeem` — redeem points
- `POST /api/customers/loyalty/:id/adjust` — manual adjustment
- `GET /api/customers/promotions` — list promotions
- `POST /api/customers/promotions` — create promotion
- `PATCH /api/customers/promotions/:id/activate` — activate
- `PATCH /api/customers/promotions/:id/pause` — pause
- `GET /api/customers/promotions/calculate?total=&voucherCode=` — calculate discount
- `GET /api/customers/vouchers` — list vouchers
- `POST /api/customers/vouchers` — create voucher

## Next Logical Work

Milestone 5 (Multi-Business Foundation) sudah selesai. Next:

**Milestone 6 — Operational Maturity:**

- Phase 8: Offline mode (IndexedDB, pending sale queue, sync)
- Phase 9: Multi-store RBAC hardening (per-store permission enforcement)
- Phase 10: WhatsApp scheduled summaries (hourly, close register, daily)
- Phase 11: Hardware polish (cash drawer trigger, customer display, QRIS/EDC adapters)

**Milestone 7 — Enterprise UI Polish (Phase 12):**

- Entry criteria: Milestone 4 stable ✅
- React Query for server state
- @tanstack/react-table for dense tables
- POS shell redesign
- Dashboard drill-down actions
