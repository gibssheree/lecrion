# Codebase Verification and Migration Notes

## 1. Verification Snapshot

The docs in `docs_plan/` are internally consistent as a target architecture.

Verified target direction:
- POS core as the source of truth
- Dashboard chatbot as the operator console
- WhatsApp chatbot as the external channel
- NestJS + TypeScript as the target backend stack
- Socket.IO + Redis/BullMQ for realtime sync
- Prisma for database access in the target system

Verified current codebase state:
- Root app is still an Express-based Node.js server in `index.js`
- Dashboard is still a separate Express server in `web/server.js`
- Dashboard route logic lives in `web/routes/dashboardRoutes.js`
- WhatsApp webhook and intent logic is still monolithic in `src/routes/fonnteWebhook.js`
- Cart and history are still in-memory in `src/services/cartManager.js` and `src/services/historyStore.js`
- The current runtime database layer is now SQLite-based through `src/services/db.js` with `better-sqlite3`
- Root `package.json` includes `better-sqlite3`, while the dashboard package still carries `mysql2` as a dependency

Frontend naming guidance:
- `apps/dashboard` should become the admin and chatbot console.
- `apps/pos-web` should be used only if the cashier UI is split from the admin console.
- `apps/bot` should stay WhatsApp-only and should not absorb dashboard UI code.

What this means:
- The repo is in a transitional state, not yet the final multi-client POS architecture.
- The docs target a scalable end state, while the current code is still a single-process bot-plus-dashboard implementation.

## 2. What Is Already Good

The current codebase already proves some important flows:
- Bot webhook delivery and deduplication
- Cart and checkout behavior
- Stock deduction and low-stock alerts
- Sales report queries
- LLM-backed reply generation
- Dashboard status and config views

That means the migration does not need to invent the whole domain model from zero.
It needs to split and harden the existing behavior into clearer services, persistent state, and realtime channels.

## 3. Main Gaps Before Production Multi-Client Use

The biggest gaps are:
- In-memory cart and history state will not survive process restart or multiple instances
- Dashboard config still writes to `.env`, which forces restarts and does not sync well
- Current bot and dashboard are tightly coupled through shared process-level assumptions
- SQLite is fine for a pilot or single-store dev setup, but it is not the best final choice for many concurrent clients
- The current code still mixes route, domain, and integration logic in large files

For a real multi-client POS, the final platform should move to a shared persistent backend with tenant isolation, audit logs, and event-driven updates.

## 4. Recommended Migration Direction

Short term:
- Keep the current Node.js app working while reducing risk
- Move temporary state out of memory
- Reduce monolithic files by extracting services and handlers
- Stop relying on dashboard writes to `.env` for operational settings

Medium term:
- Split the app into dedicated services or a monorepo
- Introduce a core API, bot service, dashboard app, and worker
- Add event outbox and realtime broadcast so bot and dashboard stay in sync

Long term:
- Use NestJS + TypeScript for the core backend structure
- Use PostgreSQL as the preferred production database
- Use Redis plus Socket.IO for fast synchronization
- Use Prisma or a comparable typed data layer
- Use React + Vite for `apps/dashboard`, and `apps/pos-web` only if a separate cashier UI is needed

## 5. Suggested File Rename Map

Current file or module | Suggested target name | Why
--- | --- | ---
`index.js` | `apps/api/src/main.ts` and part of `apps/bot/src/main.ts` | The current file mixes API routes and webhook entry logic and should be split by responsibility
`src/routes/fonnteWebhook.js` | `apps/bot/src/webhook/fonnte-webhook.controller.ts` and `apps/bot/src/intents/*` | The webhook is a monolith and should become transport plus command routing layers
`web/server.js` | `apps/dashboard/src/main.tsx` or `apps/dashboard/src/main.ts` | The dashboard should become its own app instead of a proxy wrapper around the bot server; if a cashier UI is split, it should live in `apps/pos-web` rather than `apps/bot`
`web/routes/dashboardRoutes.js` | `apps/api/src/modules/dashboard/*` and `apps/dashboard/src/services/*` | Dashboard config and status endpoints should be separated from the UI runtime
`src/services/db.js` | `libs/db/src/transaction.ts` or `libs/db/src/prisma.ts` | The data access layer should become shared infrastructure, not a local helper only
`src/services/cartManager.js` | `apps/api/src/modules/cart/cart.service.ts` | Cart state should become persistent domain logic
`src/services/checkoutManager.js` | `apps/api/src/modules/checkout/checkout.service.ts` | Checkout should be isolated as a transactional command service
`src/services/historyStore.js` | `apps/api/src/modules/chatbot/conversation.repository.ts` | History should be stored persistently and queryable by tenant and sender
`src/services/productCatalog.js` | `apps/api/src/modules/catalog/catalog.service.ts` | Product lookup should become a clean catalog module
`src/services/posReportService.js` | `apps/api/src/modules/reports/report.service.ts` | Reporting should be read-model oriented and tenant-aware
`src/services/lowStockNotifier.js` | `apps/worker/src/schedulers/low-stock.scheduler.ts` | Notifications should run outside the main request path
`src/services/geminiClient.js` | `apps/api/src/modules/llm/llm.adapter.ts` | LLM access should be behind a strict adapter and tool layer
`src/services/storePosProvider.js` | `apps/api/src/modules/llm/store-pos-context.provider.ts` | Provider context assembly belongs to a dedicated integration service

## 6. Framework Rename And Replacement Guidance

Current framework:
- Express on Node.js
- SQLite in the current root data layer
- Dashboard proxy server in front of the bot/API process

Recommended final framework set:
- NestJS for backend structure
- TypeScript for maintainability and safer refactors
- React + Vite for the dashboard UI
- Socket.IO for realtime sync
- Redis for queueing and pub/sub
- PostgreSQL for production-scale tenancy and reporting

Important migration note:
- Do not keep two independent web stacks that both try to own the same source of truth.
- If the migration is gradual, preserve one core backend at a time and move features behind it.
- The bot, dashboard, and worker should all converge on the same API and event model.
- Keep the dashboard and cashier UI as separate app names if they split: `apps/dashboard` and `apps/pos-web`.

## 7. Cleanup Candidates In The Current Repo

These items should be reviewed during migration:
- Duplicate SQL dump files in `database/`
- The root-level `query` artifact if it is only a scratch note
- Unused `mysql2` dependency in places that already moved to SQLite
- Any config path that still depends on writing back to `.env` from the dashboard
- Large monolithic service files that now mix transport, domain logic, and formatting

## 8. Practical Conclusion

The current codebase is good as a working pilot and as a source of business rules.
It is not yet the final architecture for many client stores with realtime bot-plus-dashboard sync.

The docs plan is still valid, but the migration should be staged:
1. Stabilize the current app
2. Persist shared state
3. Split bot, dashboard, and API responsibilities
4. Move to NestJS-based modular services
5. Add realtime event sync and tenant isolation

That path gives the lowest risk while preserving the existing bot behavior and operational flow.