# File Architecture

This document describes the recommended target file layout for the integrated POS, dashboard chatbot, optional cashier POS web UI, and WhatsApp chatbot system.

## 1. Proposed Monorepo Layout

```text
apps/
  api/
    src/
      main.ts
      app.module.ts
      modules/
        auth/
        tenants/
        stores/
        users/
        catalog/
        inventory/
        orders/
        checkout/
        payments/
        cashflow/
        register/
        chatbot/
        llm/
        reports/
        audit/
        sync/
      common/
        guards/
        interceptors/
        filters/
        pipes/
        decorators/
        utils/
      infrastructure/
        db/
        queue/
        realtime/
        logging/
        config/
  bot/
    src/
      main.ts
      bot.module.ts
      webhook/
      intents/
      commands/
      handlers/
      formatters/
      dedupe/
      adapters/
  dashboard/
    src/
      main.tsx
      app/
      features/
      components/
      hooks/
      services/
      pages/
      routes/
      store/
  pos-web/
    src/
      main.tsx
      app/
      features/
      components/
      hooks/
      services/
      pages/
      routes/
      store/
  worker/
    src/
      main.ts
      jobs/
      processors/
      schedulers/
      listeners/
libs/
  contracts/
    src/
      events/
      dto/
      enums/
  common/
    src/
      logger/
      errors/
      validation/
      constants/
  db/
    src/
      prisma.ts
      transactions.ts
  queue/
    src/
      bullmq.ts
      outbox.ts
  realtime/
    src/
      socket.ts
      channels.ts
      publishers.ts
      subscribers.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
infra/
  docker/
  nginx/
  monitoring/
docs_plan/
```

## 2. Module Responsibility Map

### apps/api
The core API owns all business writes and all read models.

Responsibilities:
- Authentication and authorization
- Tenant scoping
- Orders and payments
- Cashflow and register sessions
- Inventory and stock movements
- Reporting and projections
- Audit log creation
- Event publishing through outbox

### apps/bot
The bot service owns WhatsApp integration and command interpretation.

Responsibilities:
- Fonnte webhook adapter
- Message normalization
- Intent detection
- Safe command execution
- Chat history persistence
- Bot response generation
- Retry-safe webhook processing

### apps/dashboard
The dashboard owns operator and admin user experience.

Responsibilities:
- Realtime chat tab
- POS overview tabs
- Stock and cashflow tabs
- Settings tabs
- LLM testing tab
- Notification badges
- User actions and approvals

### apps/pos-web
The POS web app owns the cashier-facing checkout experience when the cashier UI is separate from the admin console.

Responsibilities:
- Fast register and checkout UI
- Product search and order entry
- Payment capture and order status views
- Stock-aware cashier interactions
- Low-latency operator workflows

### apps/worker
The worker owns asynchronous tasks.

Responsibilities:
- Outbox publishing
- Notification fan-out
- Report materialization
- Cache invalidation
- Retry queues
- Scheduled stock alerts

## 3. Current Repo Mapping

These are the current files that roughly correspond to the future structure.

| Current file | Role now | Future owner |
| --- | --- | --- |
| `index.js` | Bot API entry and HTTP routes | `apps/api/src/main.ts` plus bot adapter wiring |
| `src/routes/fonnteWebhook.js` | Monolithic WhatsApp webhook and intent engine | `apps/bot/src/webhook` and `apps/bot/src/commands` |
| `web/server.js` | Dashboard server and proxy | `apps/dashboard/src/main.tsx` plus API client; if the cashier UI is split, the POS screen belongs in `apps/pos-web/src/main.tsx` |
| `web/routes/dashboardRoutes.js` | Dashboard routes and config endpoints | `apps/api/src/modules/dashboard` and `apps/dashboard/src/services` |
| `src/services/db.js` | DB pool and transaction helper | `libs/db/src/prisma.ts` or transaction helper |
| `src/services/checkoutManager.js` | Checkout and stock update logic | `apps/api/src/modules/checkout` |
| `src/services/posReportService.js` | Report queries | `apps/api/src/modules/reports` |
| `src/services/lowStockNotifier.js` | Scheduled notifications | `apps/worker/src/schedulers` |
| `src/services/productCatalog.js` | Catalog queries | `apps/api/src/modules/catalog` |
| `src/services/historyStore.js` | In-memory history | `apps/api/src/modules/chatbot` with persistent storage |
| `src/services/cartManager.js` | In-memory cart | `apps/api/src/modules/cart` with DB or Redis storage |

## 4. Naming Conventions

- Modules are singular and domain-based.
- Command handlers should be named by action, not by transport.
- Realtime channel names should be store-scoped.
- Event names should be verb-noun and past-tense for emitted facts.
- Files should separate transport, domain, and infrastructure.

## 5. File Design Rules

- Do not place business logic directly in route handlers.
- Do not let dashboard UI own canonical business state.
- Do not let bot parsing know about raw SQL tables.
- Use DTOs or schema validation at module boundaries.
- Put shared contracts in `libs/contracts` so bot, API, dashboard, and worker all agree on event payloads.

## 6. Minimum File Set for the First Stable Release

If the system is implemented in stages, these files are the minimum useful set:

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/orders/*`
- `apps/api/src/modules/inventory/*`
- `apps/api/src/modules/cashflow/*`
- `apps/api/src/modules/reports/*`
- `apps/bot/src/main.ts`
- `apps/bot/src/webhook/*`
- `apps/bot/src/commands/*`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/features/chat/*`
- `apps/dashboard/src/features/pos/*`
- `apps/pos-web/src/main.tsx`
- `apps/pos-web/src/features/checkout/*`
- `apps/worker/src/main.ts`
- `libs/contracts/src/events/*`
- `prisma/schema.prisma`

That set is enough to support the first robust synchronized POS release.
