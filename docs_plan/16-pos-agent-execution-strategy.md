# POS Agent Execution Strategy

This document is the execution coordinator for:

- [15-enterprise-pos-parity-plan.md](./15-enterprise-pos-parity-plan.md)

Use this file when multiple AI agents will work on the Enterprise POS plan. The purpose is to make the work fast without creating conflicts in API contracts, Prisma migrations, event names, frontend API clients, reports, or business rules.

## 1. Core Rule

Do not start all agents at once.

The POS plan must start with one lead agent that locks the transaction contract and core business rules. After that verification passes, multiple agents may work in parallel by wave.

Reason:

- POS sale, payment, cashflow, stock, reporting, realtime, and dashboard updates are tightly coupled.
- If multiple agents invent their own DTOs, events, statuses, or migration assumptions, the result will compile poorly and produce incorrect business data.

## 2. Source of Truth

Agents must follow these source files and documents:

- Main plan: `docs_plan/15-enterprise-pos-parity-plan.md`
- Data/event rules: `docs_plan/04-data-events.md`
- Current API modules: `apps/api/src/modules/*`
- Current POS app: `apps/pos-web/src/*`
- Shared enums/events: `libs/contracts/src/enums/index.ts`, `libs/contracts/src/events/index.ts`
- Prisma schema: `prisma/schema.prisma`

Do not hardcode new status strings or event names if a shared contract exists.

## 3. Phase Mapping From Main Plan

Execution phases from the main plan:

- Phase 0: Stabilize current POS reporting bug.
- Phase 1: Atomic POS sale engine.
- Phase 2: Shift, register, and cashier accounting.
- Phase 3: Product catalog and inventory foundation.
- Phase 4: Advanced payment, discount, tax, and receipt.
- Phase 5: Void, refund, return, and manager approval.
- Phase 6: F&B operations: dine-in, tables, KDS, order status.
- Phase 7: Customer, loyalty, promo, and CRM.
- Phase 8: Offline mode and sync.
- Phase 9: Multi-store, roles, security, and audit hardening.
- Phase 10: Owner analytics and WhatsApp reporting.
- Phase 11: Hardware and operational polish.
- Phase 12: Enterprise UI polish and product experience.

This strategy does not change those phases. It only defines safe execution order.

## 4. Mandatory Priority Work - One Lead Agent Only

Before parallel work begins, assign exactly one lead agent.

### Lead Agent Name

Recommended name: `POS Contract Lead`

### Lead Agent Scope

The lead agent owns the initial contract and minimal backend path.

Allowed files:

- `docs_plan/15-enterprise-pos-parity-plan.md` if contract clarification is needed
- `docs_plan/16-pos-agent-execution-strategy.md` if this strategy needs updates
- `libs/contracts/src/events/index.ts`
- `libs/contracts/src/enums/index.ts`
- `apps/api/src/modules/pos/*`
- `apps/api/src/modules/checkout/*` only if absolutely needed
- `apps/api/src/modules/payments/*` only if absolutely needed
- `apps/api/src/modules/cashflow/*` only if absolutely needed
- `apps/api/src/modules/reports/*` only for a minimal integration stub if needed

### Lead Agent Tasks

1. Lock the `POST /api/pos/sales` contract.
2. Define `CreatePosSaleDto`.
3. Define `PosSaleReceipt`.
4. Define event names used by POS sale.
5. Define order status policy after POS sale.
6. Define payment status policy after POS sale.
7. Define cashflow rule:
   - cash payment creates cashflow income
   - non-cash payment does not increase cash drawer
8. Define stock rule:
   - sale decrements stock
   - insufficient stock rejects sale
9. Define idempotency rule:
   - `clientSaleId` is required
   - duplicate `clientSaleId` cannot double-create order/payment/stock movement
10. Implement minimal `PosSalesService.createSale()`.
11. Add `POST /api/pos/sales`.
12. Add or update tests for the sale transaction if test setup allows it.

### Lead Agent Verification

Before any parallel agent starts, verify:

- API builds.
- `POST /api/pos/sales` compiles.
- DTO and response are stable.
- One cash sale writes order, order items, payment, cashflow entry, stock log/movement, audit/outbox where implemented.
- One non-cash sale writes order and payment but does not increase cash drawer.
- Duplicate `clientSaleId` does not create a second sale.

Recommended commands:

```bash
npm run build:api
npm --prefix apps/api test
```

If tests are not available or fail because of unrelated existing setup, the lead agent must document the limitation and manually verify the code path as far as possible.

## 5. Parallel Wave 1 - After Contract Lead Passes

Start this wave only after the mandatory lead work is verified.

### Agent A - Backend Transaction Core Continuation

Works on:

- Phase 1 completion
- Phase 2 backend foundations if Phase 1 is stable

Owns:

- `apps/api/src/modules/pos/*`
- `apps/api/src/modules/payments/*` only for integration with sale result
- `apps/api/src/modules/cashflow/*` only for session summary and cash adjustments
- API tests for sale/register/cashflow

Must not edit:

- `apps/pos-web/src/*`
- Prisma migrations for product/inventory metadata
- Dashboard UI

Tasks:

- Harden `PosSalesService`.
- Add register session validation.
- Add shift summary endpoint.
- Add cash adjustment endpoint.
- Ensure selected payment method is stored correctly.
- Ensure sale events are written consistently.

### Agent B - POS Frontend Flow

Works on:

- Phase 0 frontend parts
- Phase 1 frontend integration

Owns:

- `apps/pos-web/src/features/checkout/*`
- `apps/pos-web/src/services/api.ts`
- `apps/pos-web/src/components/layout/PaymentDrawer.tsx`
- `apps/pos-web/src/pages/PosDashboardPage.tsx`

Must not edit:

- Backend services
- Prisma schema
- Shared event contracts unless approved by lead

Tasks:

- Replace multi-call checkout with `createPosSale()`.
- Send `clientSaleId`.
- Send active `registerSessionId`.
- Use receipt response from backend.
- Reload dashboard data when sale/realtime events arrive.
- Preserve existing cashier UX while changing business flow.

### Agent C - Reporting and Realtime

Works on:

- Phase 0 realtime/reporting fix
- Phase 1 event integration

Owns:

- `apps/api/src/modules/reports/*`
- `apps/api/src/infrastructure/realtime/*`
- `libs/realtime/*`
- `apps/worker/src/processors/*`
- `apps/pos-web/src/services/realtime.ts`
- `apps/dashboard/src/hooks/useSocket.ts`

Must not edit:

- `PosSalesService` transaction logic
- POS checkout UI except realtime service
- Prisma migrations unless required for report snapshots and approved by lead

Tasks:

- Ensure sale/payment events reach dashboards.
- Ensure projections rebuild or refresh after sale/payment confirmation.
- Fix POS socket auth.
- Align event names: `stock.low`, `stock.adjusted`, `order.created`, `order.confirmed`, `payment.confirmed`, `cashflow.income.recorded`.
- Ensure dashboard and POS can reconnect safely.

### Wave 1 Integration Check

After Agents A, B, and C finish:

- One integrator must pull all changes together.
- Resolve compile errors.
- Run API and frontend builds.
- Manually test:
  - open register
  - cash sale
  - QRIS/Transfer sale
  - dashboard updates
  - close register summary

Recommended commands:

```bash
npm run build:api
npm --prefix apps/pos-web run build
npm --prefix apps/dashboard run build
```

## 6. Parallel Wave 2 - Inventory and Shift Depth

Start this wave only after Wave 1 integration passes.

### Agent D - Inventory Ledger

Works on:

- Phase 3

Owns:

- `apps/api/src/modules/inventory/*`
- `apps/api/src/modules/catalog/*`
- Prisma migrations related to product/stock metadata
- inventory API tests

Must not edit:

- POS sale contract without lead approval
- POS frontend checkout flow
- report projection contracts unless coordinated with Agent C

Tasks:

- Add stock movement ledger path.
- Preserve compatibility with current `menu` table.
- Add stock movement APIs.
- Convert manual stock edits to movement-based adjustments.
- Add SKU/barcode/category fields only with migration discipline.

### Agent E - Shift and Register UX

Works on:

- Phase 2 frontend parts

Owns:

- `apps/pos-web/src/features/register/*`
- `apps/pos-web/src/pages/PosDashboardPage.tsx`
- `apps/pos-web/src/pages/CashflowPage.tsx`
- POS register summary UI

Must not edit:

- Backend cashflow service unless assigned
- Prisma schema

Tasks:

- Show expected cash, counted cash, and variance.
- Show payment breakdown.
- Show sold products summary.
- Improve close register modal.
- Add cash in/out UI if endpoint exists.

### Agent F - Orders and Receipt Experience

Works on:

- Phase 4 receipt foundation
- Phase 5 order action UI only after endpoints exist

Owns:

- `apps/pos-web/src/features/orders/*`
- `apps/pos-web/src/features/checkout/SuccessScreen.tsx`
- receipt preview components

Must not edit:

- Refund backend unless assigned
- POS sale service

Tasks:

- Add receipt preview from sale response.
- Add reprint placeholder.
- Add order detail drawer.
- Add action slots for void/refund/reprint, disabled until backend endpoints exist.

### Wave 2 Integration Check

Verify:

- Sale still works.
- Stock decrement writes explainable movement/log.
- Manual stock adjustment writes movement/log.
- Register summary still reconciles.
- Receipt can be viewed from success and recent orders.

## 7. Parallel Wave 3 - Advanced Checkout and Corrections

Start this wave only after Wave 2 passes.

### Agent G - Discount, Tax, Split Payment

Works on:

- Phase 4

Owns:

- POS sale DTO extensions
- backend calculation service
- payment line support
- frontend payment panel extensions

Tasks:

- Add line/order discount.
- Add tax/service charge.
- Add multiple payment lines.
- Add validation and receipt display.

### Agent H - Void, Refund, Return

Works on:

- Phase 5

Owns:

- refund/void/return endpoints
- cashflow counter-entries
- stock return movement
- approval hook
- recent order actions

Tasks:

- Implement void policy.
- Implement refund policy.
- Implement return item policy.
- Require reason and audit record.
- Add manager approval placeholder if full roles are not ready.

### Wave 3 Integration Check

Verify:

- Discounts affect total and receipt.
- Split payment reconciles.
- Refund reverses revenue/cashflow/stock correctly.
- Void/refund appears in audit logs.
- Reports do not double count refunded sales.

## 8. Parallel Wave 4 - Business Suite Expansion

Start this wave only after core POS correctness is stable.

### Agent I - F&B Operations

Works on:

- Phase 6

Scope:

- dine-in
- tables
- kitchen display
- item status
- order notes

### Agent J - Customer, Loyalty, Promo

Works on:

- Phase 7

Scope:

- customer lookup
- customer history
- loyalty points
- promo/voucher engine

### Agent K - Analytics and WhatsApp Reporting

Works on:

- Phase 10

Scope:

- hourly sales
- cashier performance
- payment mix
- low stock report
- shift close WhatsApp summaries

### Wave 4 Integration Check

Verify:

- Dine-in and pickup do not break existing POS flow.
- Promo/loyalty totals reconcile with receipt and reports.
- WhatsApp summaries match dashboard numbers.

## 9. Wave 5 - Offline, Multi-Store, Hardware, Enterprise UI

This wave should not start until the core business suite is stable.

### Agent L - Offline Sync

Works on:

- Phase 8

Scope:

- IndexedDB local queue
- offline sale cache
- sync conflict handling
- idempotent sync

### Agent M - Multi-Store, Roles, Audit

Works on:

- Phase 9

Scope:

- store scoping
- role permissions
- manager approval
- audit views

### Agent N - Hardware and Operational Polish

Works on:

- Phase 11

Scope:

- print receipt
- barcode scanner behavior
- cash drawer placeholders
- held orders

### Agent O - Enterprise UI Polish

Works on:

- Phase 12

Scope:

- UI library integration
- table upgrades
- POS shell polish
- dashboard polish
- state feedback
- visual QA

Important:

- Agent O must not move business logic into UI.
- Agent O starts only after the backend and data flows are stable.
- UI polish should improve clarity and speed, not hide unresolved data bugs.

## 10. File Ownership Rules

Use these rules to prevent conflicts:

| Area | Primary Owner | Other Agents May Edit? |
| --- | --- | --- |
| `apps/api/src/modules/pos/*` | Agent A / Lead | Only with explicit coordination |
| `apps/pos-web/src/features/checkout/*` | Agent B | Agent G later |
| `apps/pos-web/src/services/api.ts` | Agent B | Other agents add endpoints only after B contract |
| `apps/api/src/modules/reports/*` | Agent C | Analytics agent later |
| `libs/contracts/*` | Lead | Only contract changes |
| `prisma/schema.prisma` | Agent D or M | Never two migration agents at once |
| `apps/pos-web/src/features/register/*` | Agent E | Agent O UI polish later |
| `apps/pos-web/src/features/orders/*` | Agent F | Agent H for refund actions |
| `apps/dashboard/src/*` | Agent C/K/O by phase | Coordinate page ownership |

## 11. Prisma Migration Rule

Only one agent may create or edit Prisma migrations at a time.

Before migration work:

- Check current `prisma/schema.prisma`.
- Check existing migration folder.
- Define whether migration is additive or destructive.
- Prefer additive changes.
- Do not rename/drop legacy columns until compatibility code exists.

Migration-owning phases:

- Phase 3: Agent D
- Phase 6: Agent I
- Phase 7: Agent J
- Phase 8: Agent L if sync tables are needed
- Phase 9: Agent M

Never let two of those agents write migrations in the same wave.

## 12. Contract Change Rule

If an agent needs to change any of these, stop and coordinate:

- `CreatePosSaleDto`
- `PosSaleReceipt`
- event names
- order statuses
- payment statuses
- cashflow entry types
- stock movement types
- Prisma table/column names used by more than one module

The agent must update:

- `libs/contracts/*` if applicable
- API implementation
- frontend API client
- relevant docs in `docs_plan/15-enterprise-pos-parity-plan.md`
- this strategy file if execution order changes

## 13. Integration Agent Responsibilities

Each wave needs one integration agent.

The integration agent must:

- Review all changed files.
- Resolve import/module conflicts.
- Ensure no duplicate DTOs or event names were invented.
- Run builds.
- Run tests if available.
- Perform manual POS sale smoke test.
- Record what passed and what remains risky.

The integration agent should not start new feature work during integration.

## 14. Required Handoff Format For Every Agent

Every agent must finish with:

```text
Changed files:
- path
- path

Implemented:
- item
- item

Contracts used:
- endpoint
- DTO
- events

Verification:
- command/result
- manual test/result

Known risks:
- risk or "none"

Next dependency:
- what another agent can safely do next
```

## 15. Fastest Safe Execution Plan

Use this sequence for maximum speed with minimal conflict:

### Step 1 - Single Agent

Run only `POS Contract Lead`.

Goal:

- Finish mandatory priority work.
- Lock `POST /api/pos/sales`.

### Step 2 - Parallel Wave 1

Run Agents A, B, and C together.

Goal:

- Finish Phase 0 and Phase 1.
- Fix immediate dashboard update issue.
- Replace frontend checkout flow.
- Stabilize events and projections.

### Step 3 - Integration

Run one integration agent.

Goal:

- Build and smoke-test.
- Do not add new features.

### Step 4 - Parallel Wave 2

Run Agents D, E, and F together, but only Agent D may touch Prisma migrations.

Goal:

- Finish Phase 2 and Phase 3 foundations.
- Start receipt/order detail polish.

### Step 5 - Integration

Run one integration agent.

### Step 6 - Parallel Wave 3

Run Agents G and H together if their backend files are clearly split.

Goal:

- Finish Phase 4 and Phase 5.

### Step 7 - Integration

Run one integration agent.

### Step 8 - Later Waves

Run Wave 4 and Wave 5 by business priority.

Recommended order:

1. Phase 6 F&B if Lecrion is used for canteen/cafe operations.
2. Phase 7 customer/loyalty if repeat customer workflows matter.
3. Phase 10 analytics/WhatsApp reporting for owner visibility.
4. Phase 8 offline mode after sale idempotency is battle-tested.
5. Phase 9 multi-store/roles before real multi-branch deployment.
6. Phase 11 hardware polish.
7. Phase 12 UI polish after logic is stable.

## 16. Immediate Instruction To Give Agents

Use this prompt for the first lead agent:

```text
Read docs_plan/15-enterprise-pos-parity-plan.md and docs_plan/16-pos-agent-execution-strategy.md.

You are the POS Contract Lead.

Do only the Mandatory Priority Work from docs_plan/16-pos-agent-execution-strategy.md.
Lock the POST /api/pos/sales contract, implement the minimal atomic backend sale path, and verify the build.

Do not start frontend work.
Do not start inventory migrations.
Do not start UI polish.
Do not change unrelated modules.

Final response must include changed files, implemented items, contracts used, verification, known risks, and next dependency.
```

After that passes, use the Wave 1 agent scopes exactly as written in this document.

