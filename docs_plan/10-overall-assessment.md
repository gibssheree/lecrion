Overall assessment

`lecrion` is an **in-progress monorepo migration** for a POS + WhatsApp bot + admin dashboard system. The architecture in `docs_plan/` is solid and the codebase mostly points in that direction, but the implementation is **not yet internally consistent**.

The biggest theme is:

- **good direction**
- **lots of duplication and migration residue**
- **several build/runtime blockers**
- **security/auth flow not fully wired**
- **multi-tenant design is mostly aspirational, not enforced**

---

## What the codebase is trying to be

### Core subsystems
- **API / POS core**: `apps/api`
- **WhatsApp bot utilities and webhook logic**: `apps/bot`
- **Admin dashboard**: `apps/dashboard`
- **Cashier POS web**: `apps/pos-web` placeholder
- **Background worker**: `apps/worker`
- **Shared libs**: `libs/common`, `libs/contracts`, `libs/db`, `libs/queue`, `libs/realtime`
- **SQLite DB + Prisma config**: `database/`, `prisma/schema.prisma`, `prisma.config.ts`
- **Architecture docs**: `docs_plan/*`

The docs are very explicit that:
- POS core should be source of truth
- bot/dashboard are clients
- outbox + realtime should keep things synced
- tenancy, validation, audit, idempotency should be enforced everywhere

That part is well thought out.

---

## What’s actually implemented

### 1) API app (`apps/api`)
This is the main runtime.

It includes:
- auth
- catalog/products
- inventory
- orders
- payments
- cashflow/register
- reports/read models
- audit logs
- chatbot history/cart
- LLM console/tools
- bot webhook dispatch

This is the most complete part of the repo.

### 2) Dashboard (`apps/dashboard`)
A React/Vite admin UI with:
- overview
- chat history
- live feed
- orders
- inventory
- LLM console
- settings
- cashflow

It’s functional in shape, but auth integration is not complete.

### 3) Worker (`apps/worker`)
Contains:
- outbox processor
- low stock notifier
- read model rebuild scheduler

This is a good architectural idea, but the workspace/package wiring is incomplete.

### 4) Bot utilities (`apps/bot`)
This contains:
- intent detection
- message formatters
- webhook registration
- Fonnte transport
- dedupe helpers
- group guard logic

But it’s not really a standalone app yet; it’s more like a helper bundle.

---

## Biggest strengths

### 1) The domain model is coherent
The code clearly covers:
- menu/catalog
- orders
- payments
- cashflow
- register sessions
- stock movement logs
- chat history
- read models
- audit logs
- webhook deduplication
- idempotency

That’s a strong base.

### 2) The architecture intent is good
You have:
- global validation
- guards
- structured logging
- realtime Socket.IO
- outbox/read model concepts
- LLM tool restrictions
- background workers

That’s the right shape for this kind of system.

### 3) The dashboard is purpose-built
The dashboard pages line up well with the API:
- overview
- live activity
- history
- orders
- inventory
- settings
- LLM test console

### 4) LLM safety is not ignored
The LLM stack includes:
- role-specific prompts
- tool-only read access
- output guardrails
- reply length limits
- audit logging

That’s better than most prototypes.

---

## Major blockers / problems

## 1) The repo does not currently build cleanly

### API build problem
TypeScript diagnostics show `apps/api` pulls in files from outside its `rootDir`:
- `libs/db`
- `libs/realtime`
- `apps/bot`

That means `apps/api/tsconfig.json` is not aligned with how the code imports shared code. In practice, the API build is currently broken by monorepo boundary issues.

### Dashboard build problem
Diagnostics show duplicate declarations in:
- `apps/dashboard/src/pages/Chat.tsx`
- `apps/dashboard/src/pages/Inventory.tsx`
- `apps/dashboard/src/pages/Orders.tsx`

Those files contain duplicated implementations, so the dashboard build is currently broken there too.

### API test typing problem
The API TypeScript run also reports missing Jest globals in test files, so tests are not wired cleanly through the TS config.

### TS version/config drift
The root repo is on TypeScript `^6.0.3`, and `apps/api/tsconfig.json` trips the `baseUrl` deprecation warning. So the toolchain is already showing version drift.

---

## 2) Root scripts are stale or invalid

In the root `package.json`:

- `start` points to `index.js`, but no such file exists
- `dev` points to `nodemon index.js`, also missing
- `start:web` / `dev:web` point to a `web` folder that does not exist
- `migrate:phase1` / `migrate:phase3` point to scripts that do not exist
- `start:worker` points to `apps/worker/src/main.js`, but only TypeScript source exists
- `start:all` depends on those missing scripts

So the top-level operational scripts are largely out of date.

---

## 3) Workspace/package layout is inconsistent

The root `workspaces` list includes directories that are not actual npm packages:
- `apps/worker` has no `package.json`
- `libs/*` directories have no `package.json`
- `libs/validation` is only docs, no package

That’s a monorepo hygiene issue and a sign the migration is incomplete.

---

## 4) Auth flow is not production-ready

This is one of the biggest functional issues.

### Problems:
- `AuthController` login/refresh routes are not marked `@Public()`
- global `JwtAuthGuard` applies to everything unless explicitly public
- the dashboard frontend does not send bearer tokens or API keys
- the dashboard websocket client sends `auth: { apiKey: "" }`

So in normal auth-enabled mode:
- login is likely blocked
- dashboard API calls likely fail
- websocket auth likely fails

In short: **the admin dashboard auth story is not wired through end-to-end**.

---

## 5) Order status vocabulary is fragmented

This is a major domain bug.

Different parts of the system use different status values:

- Prisma schema default: `Not Ready`
- `OrdersService`: `Not Ready`, `Ready`, `Success`, `Completed`, `cancelled`, `refunded`
- shared contracts: `draft`, `pending_payment`, `paid`, `confirmed`, `completed`, `cancelled`, `refunded`
- dashboard UI: `Not Ready`, `confirmed`, `pending_payment`, `completed`, `cancelled`

This means:
- queries can miss rows
- reports can undercount
- UI badges/filters can misbehave
- status transitions are inconsistent across services

This should be normalized into one shared enum/contract.

---

## 6) Multi-tenancy is not actually enforced

The docs say every business object should carry `tenant_id` or `store_id`, but in practice:

- many tables are global
- several services ignore the `storeId` parameter
- `store_settings` is not store-scoped at all
- `OrdersService`, `ReportsService`, `CatalogService`, etc. mostly query globally
- `AuditService` defaults to `default/default-store` unless explicitly passed

So the system is still effectively **single-tenant with a few store-like fields**, not a fully isolated multi-tenant app.

---

## 7) Outbox/read-model pattern is only partially implemented

You have the right idea, but it’s not atomic everywhere.

Examples:
- `CheckoutService` writes domain rows in a transaction, but outbox publishing happens after the transaction
- `SyncService.emitOutboxEvent` writes outside the transaction boundary
- `libs/queue/src/outbox.ts` exists, but it’s not consistently used
- `worker` rebuilds read models independently with duplicated SQL
- `api` also rebuilds read models in `ReadModelService`

So the architecture exists, but the true “transaction + outbox” discipline is not consistently enforced.

---

## 8) Some implemented features are dead or incomplete

### Dead / unhandled intent paths
`apps/bot/src/intents/intentDetector.ts` can return favorite-related intents:
- `favorite_list`
- `favorite_add`
- `favorite_remove`

But `BotDispatchService` does not handle them. Those commands fall through to AI fallback.

### Placeholder / incomplete modules
- `apps/pos-web` is basically a shell
- `libs/queue/src/bullmq.ts` is empty
- `apps/bot` is not a true runnable service
- some lib folders are only partial implementations

---

## 9) Some UI/API mismatches exist

A few examples:
- `apps/dashboard/src/pages/Orders.tsx` computes revenue from `o.total`, but `/api/orders` does not return `total`
- `stores` settings UI implies store-scoped config, but backend settings are global
- inventory stock updates from the dashboard do not appear to write audit/realtime events the way other mutations do
- manual stock edits via catalog controller do not emit the same operational events as checkout stock changes

---

## 10) Observability is good in spirit, but not fully correct

You have:
- structured logger
- request correlation IDs
- health checks
- metrics endpoint
- websocket feed

But:
- `libs/common/src/telemetry/metrics.ts` is not a fully compliant Prometheus exporter
- histogram rendering is incomplete
- some “subscriber” helpers in realtime look conceptually wrong
- logs/metrics are good direction, but not production-tuned yet

---

## Data/storage layer summary

### Current DB choice
The app is using **SQLite** through Prisma with `better-sqlite3`.

### Evidence
- `prisma.schema` datasource is SQLite
- `prisma.config.ts` points to `file:./database/canteen.db`
- committed files include:
  - `database/canteen.db`
  - `canteen.db-wal`
  - `canteen.db-shm`

This is fine for local/dev, but not aligned with the docs’ recommendation of PostgreSQL for scale.

### Schema characteristics
- lots of `String` timestamps
- many denormalized fields
- some strong relations for orders/payments/favorites/notifications
- no real tenant/store foreign-key isolation
- a lot of application logic compensates for schema limitations

---

## Code quality notes by area

### API
Best part of the repo overall, but:
- app module file is malformed
- auth flow incomplete
- cross-app imports are breaking the build
- status/tenant logic is inconsistent

### Dashboard
Most complete UI, but:
- duplicated page implementations
- no real auth integration
- relies on backend being open or proxied
- some data assumptions don’t match the API

### Bot
The bot domain logic is decent:
- intent parsing
- formatting
- delivery flow
- nutrition/report/product handling
- low-stock and cart logic

But it’s split awkwardly between `apps/api/src/modules/bot` and `apps/bot`, which creates duplication and compilation problems.

### Worker
Conceptually solid:
- outbox processing
- read model rebuild
- low stock notifications

But it’s not fully packaged and shares a lot of logic with the API.

### Shared libs
Good idea, but only partially developed:
- `libs/common`: logger + metrics
- `libs/contracts`: enums/events only
- `libs/db`: Prisma service + transaction helper
- `libs/queue`: mostly stubbed
- `libs/realtime`: working socket singleton, but some helpers are dubious

---

## My verdict

### Short version:
This is a **well-planned but still transitional codebase**.

It has the right enterprise architecture ideas:
- POS core
- bot adapter
- admin dashboard
- worker
- audit
- idempotency
- outbox
- realtime
- LLM guardrails

But the implementation is still in a migration phase, with:
- broken build edges
- stale scripts
- duplicated modules
- incomplete auth
- inconsistent status enums
- weak tenancy enforcement
- placeholder app/package structure
