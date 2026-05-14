# Zed-Based Execution Checklist

This document converts the repo recovery plan into a commit-order checklist.

Use it top-to-bottom. Do not start a task until its dependencies are done.
After every task, run diagnostics and keep the diff focused.

## Legend

Each task includes:
- **Exact files to touch** — the concrete files that should change
- **Dependency order** — what must already be finished before starting
- **Done when** — the exit criteria for the task

---

## Phase 0 — Stabilize the Workspace

### P0-1 — Fix root scripts and workspace boundaries

**Exact files to touch**
- `package.json`
- `tsconfig.json`
- `apps/worker/package.json`  
  Create this file if `apps/worker` is meant to run as its own app.

**Dependency order**
- None

**Done when**
- Root scripts no longer point at missing legacy files.
- Workspace entries match the actual package/source layout.
- The monorepo root no longer assumes `web/` or other removed paths exist.

---

### P0-2 — Stabilize the API compile boundary

**Exact files to touch**
- `apps/api/tsconfig.json`
- `apps/api/tsconfig.build.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `tsconfig.json`

**Dependency order**
- P0-1

**Done when**
- `apps/api` no longer pulls source outside its intended compilation root.
- Cross-root import leakage is removed or intentionally isolated through workspace-safe aliases/build settings.
- The API app module wiring is consistent with the actual runtime graph.

---

### P0-3 — Remove duplicated dashboard page implementations

**Exact files to touch**
- `apps/dashboard/src/pages/Chat.tsx`
- `apps/dashboard/src/pages/Inventory.tsx`
- `apps/dashboard/src/pages/Orders.tsx`

**Dependency order**
- P0-1

**Done when**
- Each page has a single exported implementation.
- Dashboard type-check/build no longer reports duplicate function or export declarations.

---

### P0-4 — Fix test typing and explicit stubs

**Exact files to touch**
- `apps/api/tsconfig.json`
- `apps/api/tsconfig.build.json`
- `apps/api/src/app.controller.spec.ts`
- `apps/api/test/app.e2e-spec.ts`
- `libs/queue/src/bullmq.ts`

**Dependency order**
- P0-2

**Done when**
- Jest test files are either typed correctly or excluded intentionally.
- Missing globals like `describe` / `it` / `expect` no longer block the API TypeScript run.
- Empty stubs like `libs/queue/src/bullmq.ts` are either implemented, removed, or explicitly documented as unused.

---

## Phase 1 — Restore Secure Access Control

### P1-1 — Make auth entrypoints intentionally public

**Exact files to touch**
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/common/decorators/public.decorator.ts`
- `apps/api/src/main.ts`

**Dependency order**
- P0-2

**Done when**
- Login and refresh routes are reachable without being blocked by the global auth guard.
- Only intentionally public routes remain public.
- Health and metrics stay public for monitoring, while other routes remain protected.

---

### P1-2 — Define the service-to-service identity contract

**Exact files to touch**
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.types.ts`
- `apps/api/src/modules/auth/jwt.strategy.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`

**Dependency order**
- P1-1

**Done when**
- Human users, bot service, worker service, and dashboard/service callers all resolve to the correct identity shape.
- API key and JWT paths are explicit and consistent.
- The guard no longer depends on undocumented behavior.

---

### P1-3 — Wire dashboard client authentication

**Exact files to touch**
- `apps/dashboard/src/services/api.ts`
- `apps/dashboard/src/hooks/useSocket.ts`
- `apps/dashboard/src/App.tsx`

**Dependency order**
- P1-2

**Done when**
- Dashboard HTTP requests send the correct credentials.
- Dashboard websocket connections use the same auth model as HTTP.
- The dashboard no longer relies on an empty placeholder API key.

---

## Phase 2 — Normalize Core Domain Contracts

### P2-1 — Canonicalize order status values

**Exact files to touch**
- `libs/contracts/src/enums/index.ts`
- `apps/api/src/modules/orders/orders.service.ts`
- `apps/api/src/modules/orders/orders.controller.ts`
- `apps/api/src/modules/payments/payments.service.ts`
- `apps/dashboard/src/pages/Orders.tsx`

**Dependency order**
- P1-2

**Done when**
- One order-status vocabulary is used across backend and frontend.
- Reporting and filtering do not depend on mixed values like `Not Ready`, `Success`, `Completed`, and `pending_payment` without a mapping.
- The status set is documented in the shared contract layer.

---

### P2-2 — Normalize register and cashflow status/event vocabulary

**Exact files to touch**
- `libs/contracts/src/events/index.ts`
- `apps/api/src/modules/cashflow/cashflow.service.ts`
- `apps/api/src/modules/register/register.service.ts`
- `apps/api/src/modules/register/register.controller.ts`
- `apps/dashboard/src/pages/Cashflow.tsx`

**Dependency order**
- P2-1

**Done when**
- Register/session status names are consistent.
- Event names emitted by the core match the shared event contract.
- The dashboard and API refer to the same business states.

---

## Phase 3 — Enforce Store and Tenant Isolation

### P3-1 — Scope settings and request context by store/tenant

**Exact files to touch**
- `apps/api/src/modules/stores/stores.service.ts`
- `apps/api/src/modules/stores/stores.controller.ts`
- `apps/api/src/common/guards/tenant.guard.ts`
- `apps/api/src/common/decorators/store-id.decorator.ts`

**Dependency order**
- P2-1

**Done when**
- Store settings are read and written in a store-aware way.
- The request context consistently exposes the resolved store/tenant identifiers.
- Store-aware endpoints no longer behave like global settings endpoints.

---

### P3-2 — Scope core domain reads and audit logs

**Exact files to touch**
- `apps/api/src/modules/orders/orders.service.ts`
- `apps/api/src/modules/catalog/catalog.service.ts`
- `apps/api/src/modules/inventory/inventory.service.ts`
- `apps/api/src/modules/audit/audit.service.ts`
- `apps/api/src/modules/reports/reports.service.ts`
- `apps/api/src/modules/reports/read-model.service.ts`

**Dependency order**
- P3-1

**Done when**
- Reads no longer leak data across stores/tenants by default.
- Audit entries carry the correct actor and store context.
- Reporting and catalog reads respect the same boundary rules as mutating endpoints.

---

### P3-3 — Propagate store context into background processing and realtime

**Exact files to touch**
- `apps/worker/src/processors/outboxProcessor.ts`
- `apps/worker/src/schedulers/lowStockScheduler.ts`
- `apps/worker/src/schedulers/readModelScheduler.ts`
- `apps/worker/src/main.ts`
- `libs/realtime/src/channels.ts`
- `libs/realtime/src/publishers.ts`
- `libs/realtime/src/socket.ts`

**Dependency order**
- P3-1

**Done when**
- Worker jobs carry explicit store context.
- Realtime room and event naming is namespaced and deterministic.
- Worker-generated events can be traced back to the correct store/tenant.

---

## Phase 4 — Make Outbox and Read Models Reliable

### P4-1 — Make event writes transactional with domain changes

**Exact files to touch**
- `apps/api/src/modules/checkout/checkout.service.ts`
- `apps/api/src/modules/orders/orders.service.ts`
- `apps/api/src/modules/payments/payments.service.ts`
- `apps/api/src/modules/sync/sync.service.ts`
- `libs/queue/src/outbox.ts`

**Dependency order**
- P3-2

**Done when**
- Domain writes and outbox writes are part of one intentional transaction flow.
- The system no longer relies on ad hoc post-commit event emission for critical state changes.
- The canonical outbox writer path is obvious.

---

### P4-2 — Consolidate read-model rebuilding

**Exact files to touch**
- `apps/api/src/modules/reports/read-model.service.ts`
- `apps/api/src/modules/reports/reports.service.ts`
- `apps/worker/src/schedulers/readModelScheduler.ts`
- `apps/worker/src/processors/outboxProcessor.ts`

**Dependency order**
- P4-1

**Done when**
- There is one intentional source of truth for projections.
- The API and worker do not rebuild the same read models in conflicting ways.
- Projection refresh results have one consistent shape.

---

### P4-3 — Verify worker idempotency and failure handling

**Exact files to touch**
- `apps/worker/src/processors/outboxProcessor.ts`
- `apps/worker/src/main.ts`
- `libs/db/src/transactions.ts`

**Dependency order**
- P4-1

**Done when**
- Retries are bounded and observable.
- Dead-letter behavior is explicit.
- Shutdown and restart behavior does not duplicate work.

---

## Phase 5 — Consolidate Bot Logic

### P5-1 — Decide the webhook and dispatch ownership

**Exact files to touch**
- `apps/api/src/modules/bot/bot.controller.ts`
- `apps/api/src/modules/bot/bot.module.ts`
- `apps/api/src/modules/bot/bot-dispatch.service.ts`
- `apps/bot/src/webhook/webhookRegistrar.ts`
- `apps/bot/src/main.ts`
- `apps/bot/src/bot.module.ts`

**Dependency order**
- P1-2
- P3-3

**Done when**
- One clear path owns webhook intake.
- One clear path owns message dispatch.
- There is no accidental duplication of the same transport behavior in multiple places.

---

### P5-2 — Normalize shared intent and formatting logic

**Exact files to touch**
- `apps/bot/src/intents/intentDetector.ts`
- `apps/bot/src/intents/ingredientIntent.ts`
- `apps/bot/src/intents/reportIntent.ts`
- `apps/bot/src/formatters/menuFormatter.ts`
- `apps/bot/src/formatters/ingredientFormatter.ts`
- `apps/bot/src/formatters/reportFormatter.ts`
- `apps/api/src/modules/bot/bot-dispatch.service.ts`

**Dependency order**
- P5-1

**Done when**
- Recognized intents are handled in one place.
- Shared formatting is not duplicated as conflicting logic across app boundaries.
- The bot’s fallback behavior is deliberate rather than accidental.

---

### P5-3 — Add or remove intents that are currently unhandled

**Exact files to touch**
- `apps/api/src/modules/bot/bot-dispatch.service.ts`
- `apps/bot/src/intents/intentDetector.ts`

**Dependency order**
- P5-2

**Done when**
- Intent paths such as favorites are either handled explicitly or removed from detection.
- No recognized intent falls through silently without a conscious fallback policy.

---

## Phase 6 — Align Frontend Contracts With API Responses

### P6-1 — Align dashboard DTO expectations with backend payloads

**Exact files to touch**
- `apps/dashboard/src/services/api.ts`
- `apps/dashboard/src/pages/Orders.tsx`
- `apps/dashboard/src/pages/Inventory.tsx`
- `apps/dashboard/src/pages/Cashflow.tsx`
- `apps/dashboard/src/pages/Settings.tsx`

**Dependency order**
- P2-1
- P3-2

**Done when**
- The dashboard no longer relies on fields the API does not return.
- Inventory, orders, cashflow, and settings pages match the actual backend payload shape.
- Any intentional mismatch is documented in the API client instead of hidden in the UI.

---

### P6-2 — Standardize dashboard realtime usage

**Exact files to touch**
- `apps/dashboard/src/hooks/useSocket.ts`
- `apps/dashboard/src/pages/LiveFeed.tsx`
- `apps/dashboard/src/pages/BotOverview.tsx`

**Dependency order**
- P3-3

**Done when**
- Realtime event names and rooms match backend emission semantics.
- The dashboard listens to the right event set and no longer assumes vague/default room behavior.

---

### P6-3 — Decide the `apps/pos-web` posture

**Exact files to touch**
- `apps/pos-web/package.json`
- `apps/pos-web/src/main.tsx`
- `apps/pos-web/src/**`

**Dependency order**
- P0-1

**Done when**
- `apps/pos-web` is either a real app with a defined purpose or explicitly documented as placeholder-only.
- The workspace no longer implies a cashier app that does not actually exist.

---

## Phase 7 — Improve Observability and Safety

### P7-1 — Standardize structured logging and correlation flow

**Exact files to touch**
- `apps/api/src/common/interceptors/logging.interceptor.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `libs/common/src/logger/index.ts`
- `apps/worker/src/telemetry/logger.ts`
- `apps/bot/src/telemetry/logger.ts`

**Dependency order**
- P1-2

**Done when**
- API, worker, and bot logs carry comparable structured metadata.
- Correlation IDs can be followed across request and background-job boundaries.
- Logging behavior is consistent instead of ad hoc per app.

---

### P7-2 — Harden validation and error payloads

**Exact files to touch**
- `apps/api/src/common/pipes/validation.pipe.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/src/modules/*/*.controller.ts`

**Dependency order**
- P1-1

**Done when**
- Write endpoints reject bad input consistently.
- Error payloads are normalized and machine-readable.
- Validation behavior is not drifting between controllers.

---

### P7-3 — Fix metrics and health behavior

**Exact files to touch**
- `libs/common/src/telemetry/metrics.ts`
- `apps/api/src/modules/health/health.service.ts`
- `apps/api/src/modules/health/health.controller.ts`

**Dependency order**
- P7-1

**Done when**
- Metrics output is stable and useful for monitoring.
- Histogram behavior is intentional.
- Health checks remain accurate and do not hide critical failures.

---

## Phase 8 — Database and Migration Cleanup

### P8-1 — Decide the storage strategy explicitly

**Exact files to touch**
- `prisma.config.ts`
- `prisma/schema.prisma`
- `package.json`

**Dependency order**
- P0-1

**Done when**
- It is explicit whether SQLite is dev-only or the production target.
- Runtime config and Prisma config agree on the storage path/engine.
- The database choice matches the intended deployment model.

---

### P8-2 — Normalize schema conventions

**Exact files to touch**
- `prisma/schema.prisma`
- `libs/contracts/src/enums/index.ts`
- `libs/contracts/src/events/index.ts`

**Dependency order**
- P8-1

**Done when**
- Timestamp conventions are consistent.
- Enum usage is intentional and shared.
- String defaults that encode business logic are reviewed and documented.

---

### P8-3 — Document source roots, shared sources, and packages

**Exact files to touch**
- `docs_plan/09-zed-based-plan.md`
- `docs_plan/10-overall-assessment.md`
- `docs_plan/README.md`

**Dependency order**
- P0-1

**Done when**
- It is obvious which folders are app packages, shared source roots, or docs-only areas.
- The repo no longer implies a package strategy that is not actually in place.

---

## Suggested commit order

1. P0-1 — workspace and root script cleanup
2. P0-2 — API compile boundary stabilization
3. P0-3 — dashboard duplicate removal
4. P0-4 — tests and stubs
5. P1-1 to P1-3 — auth flow repair
6. P2-1 to P2-2 — core contract normalization
7. P3-1 to P3-3 — tenancy and store isolation
8. P4-1 to P4-3 — outbox and projections
9. P5-1 to P5-3 — bot consolidation
10. P6-1 to P6-3 — frontend contract alignment
11. P7-1 to P7-3 — observability and safety
12. P8-1 to P8-3 — database/migration cleanup

---

## Definition of done for this checklist

This checklist is complete when:

- the repo builds cleanly
- the dashboard authenticates correctly
- order and register statuses are consistent
- store/tenant boundaries are enforced
- bot and dashboard behavior share stable contracts
- outbox processing is reliable
- background jobs are deployable
- diagnostics and health checks are useful in production
- the storage strategy and package layout are documented clearly
