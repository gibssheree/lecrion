# POS + Chatbot Architecture Docs

This folder is the target architecture reference for the Lecrion platform:
a multi-store POS system with WhatsApp bot integration and an admin dashboard.

## System overview

Three tightly integrated subsystems:

1. **POS core** (`apps/api`) — the source of truth for all business state
2. **Admin dashboard** (`apps/dashboard`) — operator console and chatbot monitor
3. **WhatsApp bot** (`apps/bot` utilities + `apps/api/src/modules/bot`) — external interaction channel

## Recommended stack

| Layer         | Technology                                         |
| ------------- | -------------------------------------------------- |
| Backend       | NestJS + TypeScript                                |
| Database      | SQLite (dev/single-node) → PostgreSQL (production) |
| ORM           | Prisma                                             |
| Realtime      | Socket.IO                                          |
| Queue         | SQLite outbox (dev) → BullMQ + Redis (production)  |
| Dashboard UI  | React + Vite                                       |
| Bot transport | Fonnte WhatsApp API                                |
| AI            | Google Gemini / Vertex AI                          |

## Package layout

```
apps/
  api/          NestJS API — POS core, webhook intake, all business logic
  bot/          Bot utility bundle — intents, formatters, transport helpers
                (NOT a standalone runnable service — imported by apps/api)
  dashboard/    React/Vite admin dashboard
  pos-web/      Cashier POS UI — placeholder, not yet implemented
  worker/       Background worker — outbox processor, schedulers

libs/
  contracts/    Canonical enums, event type strings, shared DTOs
  common/       Structured logger, Prometheus metrics
  db/           PrismaService, transaction helper, projection builders
  queue/        Outbox writer (transactional + best-effort)
  realtime/     Socket.IO singleton, channel names, publishers

prisma/
  schema.prisma   SQLite schema (dev) — see file for PostgreSQL migration notes
  migrations/     Prisma migration history

docs_plan/        Architecture reference docs (this folder)
```

## Design principles

- The POS core is the source of truth. Dashboard, bot, and LLM are clients.
- No channel may bypass validation, tenancy, audit logging, or transaction rules.
- Every domain write emits an outbox event in the same transaction.
- Status values, event names, and entry types are defined in `libs/contracts` — never hardcoded inline.

## Reading order

1. [01-blueprint.md](01-blueprint.md) — goals, system boundaries, data ownership rules
2. [02-roadmap.md](02-roadmap.md) — implementation phases
3. [03-file-architecture.md](03-file-architecture.md) — module responsibility map
4. [04-data-events.md](04-data-events.md) — event model and outbox pattern
5. [05-security-ops.md](05-security-ops.md) — auth, RBAC, observability
6. [06-codebase-verification-and-migration.md](06-codebase-verification-and-migration.md) — migration checklist
7. [07-ultimate-tasks.md](07-ultimate-tasks.md) — implementation task list
8. [08-fix-tasks.md](08-fix-tasks.md) — completed fix tasks
9. [09-zed-based-plan.md](09-zed-based-plan.md) — commit-order recovery checklist
10. [10-overall-assessment.md](10-overall-assessment.md) — codebase assessment
11. [11-dashboard-components-and-routing-plan.md](11-dashboard-components-and-routing-plan.md) — dashboard UI extraction and routing plan
12. [12-app-store-bootstrap-plan.md](12-app-store-bootstrap-plan.md) — future dashboard app/store bootstrap plan
13. [13-app-and-store-implementation-plan.md](13-app-and-store-implementation-plan.md) — concrete dashboard app/store implementation plan
14. [17-business-vertical-navigation-architecture-plan.md](17-business-vertical-navigation-architecture-plan.md) — business-category-based sidebar, module capability, and backend entitlement plan

## Current implementation status

As of the P0–P8 recovery pass:

| Area                         | Status                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| Workspace / build            | ✅ Fixed — all packages have package.json, tsconfig boundaries correct     |
| Auth flow                    | ✅ Fixed — login/refresh public, dashboard sends API key + JWT             |
| Order status vocabulary      | ✅ Fixed — canonical enum in libs/contracts, all services aligned          |
| Register/cashflow vocabulary | ✅ Fixed — canonical enums, no inline strings                              |
| Store settings scoping       | ✅ Fixed — keys namespaced by storeId                                      |
| Reports SQL                  | ✅ Fixed — canonical status values, no legacy strings                      |
| Outbox atomicity             | ✅ Fixed — outbox writes inside $transaction in checkout, orders, payments |
| Read-model deduplication     | ✅ Fixed — single SQL source in libs/db/src/projections.ts                 |
| Worker idempotency           | ✅ Fixed — stuck-row recovery, transactional inbox+outbox update           |
| Bot ownership                | ✅ Documented — apps/bot is utility bundle, API owns webhook               |
| Favorite intents             | ✅ Fixed — explicit unsupported response instead of AI fallback            |
| Dashboard payload shapes     | ✅ Fixed — cashflow/reports wrappers aligned with API responses            |
| Realtime event names         | ✅ Fixed — dashboard listens to canonical event names                      |
| Structured logging           | ✅ Fixed — correlation IDs thread through NestJS logger                    |
| Metrics                      | ✅ Fixed — valid Prometheus histogram buckets, no label rendering bug      |
| Schema defaults              | ✅ Fixed — orders.status default is "pending" (was "Not Ready")            |
| Storage strategy             | ✅ Documented — SQLite dev, PostgreSQL production path                     |
| pos-web                      | ⏳ Placeholder — documented as not yet implemented                         |
| Dashboard routing/components | ✅ Implemented — reusable UI + URL-based routing refactor                 |
| Dashboard app/store folders   | ⏳ Deferred — intentionally empty until a real need appears               |
| App/store implementation      | ⏳ Planned — concrete bootstrap and shared-state implementation path      |
| Multi-tenancy (full)         | ⏳ Partial — store_settings namespaced, catalog/menu still global          |
| PostgreSQL migration         | ⏳ Future — migration notes in schema.prisma and prisma.config.ts          |
| BullMQ / Redis               | ⏳ Future — libs/queue/src/bullmq.ts is a documented placeholder           |
