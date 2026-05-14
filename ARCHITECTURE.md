# Lecrion — Architecture Overview

Lecrion is a multi-store POS platform with WhatsApp bot integration and an admin dashboard.

## Quick start

```bash
# Start the API (NestJS)
npm run start:api:dev

# Start the dashboard (React/Vite, proxies /api to localhost:3000)
npm run start:dashboard

# Start the background worker
npm run start:worker

# Prisma
npm run db:generate    # regenerate Prisma client after schema changes
npm run db:push        # push schema to SQLite without a migration file
npm run db:migrate     # create and apply a migration
npm run db:studio      # open Prisma Studio at localhost:5555
```

## Package layout

```
lecrion/
├── apps/
│   ├── api/          NestJS API — all business logic, webhook intake
│   ├── bot/          Bot utility bundle — NOT a standalone app
│   │                 (intents, formatters, transport helpers)
│   │                 Imported by apps/api via @bot/* path alias
│   ├── dashboard/    React/Vite admin dashboard (port 5173 in dev)
│   ├── pos-web/      Cashier POS UI — placeholder, not yet implemented
│   └── worker/       Background worker — outbox processor, schedulers
│
├── libs/
│   ├── contracts/    Canonical enums, event type strings, shared DTOs
│   │                 ← Import status values and event names from here
│   ├── common/       Structured logger (createServiceLogger), Prometheus metrics
│   ├── db/           PrismaService, withPrismaTransaction, projection builders
│   ├── queue/        writeToOutbox (transactional), writeToOutboxBestEffort
│   └── realtime/     Socket.IO singleton, channel names, typed publishers
│
├── prisma/
│   ├── schema.prisma   SQLite schema (dev) — see file for PostgreSQL migration notes
│   └── migrations/     Prisma migration history
│
├── database/
│   └── canteen.db      SQLite database file (dev only — not committed to git)
│
├── docs_plan/          Architecture reference docs
├── prisma.config.ts    Prisma CLI config — reads DATABASE_URL from env
└── ARCHITECTURE.md     This file
```

## App responsibilities

### apps/api

The POS core. Owns all business writes and read models.

- Auth (JWT + API key), RBAC, tenant guard
- Product catalog, inventory, stock movements
- Orders, checkout, payments
- Cashflow ledger, register sessions
- Reporting projections (cached in report_snapshots)
- Audit log
- WhatsApp webhook intake (`POST /api/bot/webhook`)
- Bot message dispatch (routes intents to POS services)
- Socket.IO server (realtime events to dashboard)

### apps/bot

A utility bundle, not a runnable service.

Contains: intent detection, reply formatters, group guard, Fonnte transport, webhook deduplication.

Imported by `apps/api` via the `@bot/*` TypeScript path alias. The active webhook path is `apps/api/src/modules/bot/bot.controller.ts`.

### apps/dashboard

React/Vite admin console.

- Bot overview, chat history, live feed
- Orders, inventory, cashflow
- LLM test console, settings
- Connects to API via Vite proxy in dev, direct URL in production
- Auth: sends `X-Api-Key` (service mode) or `Authorization: Bearer` (after login)
- Realtime: Socket.IO client, listens to store-namespaced rooms

### apps/worker

Standalone TypeScript process (no NestJS).

- Outbox processor: polls `sync_outbox`, delivers events to `sync_inbox` + realtime
- Read-model scheduler: rebuilds `report_snapshots` on interval
- Low-stock scheduler: sends WhatsApp alerts via Fonnte

### apps/pos-web

Placeholder for a future cashier-facing POS UI. Not yet implemented.

## Shared libraries

### libs/contracts

**Import from here for all status values and event names.**

```typescript
import {
  OrderStatus,
  RegisterSessionStatus,
  CashflowEntryType,
} from "@libs/contracts/src/enums";
import {
  ORDER_EVENTS,
  STOCK_EVENTS,
  REGISTER_EVENTS,
} from "@libs/contracts/src/events";
```

### libs/db

```typescript
import { PrismaService } from "@libs/db/src/prisma";
import { withPrismaTransaction } from "@libs/db/src/transactions";
import { rebuildProjections, buildProjection } from "@libs/db/src/projections";
```

### libs/queue

```typescript
// Inside a $transaction callback — atomic with domain writes
import { writeToOutbox } from "@libs/queue/src/outbox";
await writeToOutbox(tx, ORDER_EVENTS.CREATED, payload, { storeId });

// Outside a transaction — best-effort, swallows errors
import { writeToOutboxBestEffort } from "@libs/queue/src/outbox";
```

### libs/common

```typescript
import { createServiceLogger } from "@libs/common/src/logger";
import { metrics, renderMetrics } from "@libs/common/src/telemetry/metrics";
```

### libs/realtime

```typescript
import { emit } from "@libs/realtime/src/socket";
import {
  emitOrderCreated,
  emitStockAlert,
} from "@libs/realtime/src/publishers";
import { channels } from "@libs/realtime/src/channels";
```

## Database

**Current:** SQLite via `better-sqlite3` adapter. DB file at `database/canteen.db`.

**Production target:** PostgreSQL. See `prisma/schema.prisma` and `prisma.config.ts` for the migration path.

**Key schema notes:**

- All timestamps are `String` (ISO 8601) — SQLite has no native DateTime
- `orders.status` default is `"pending"` — canonical value from `OrderStatus.PENDING`
- `store_settings` keys are namespaced as `{storeId}:{key}` (no store_id column yet)
- `menu` table has no `store_id` — catalog is currently global (single-store)
- `users` table has no `role` or `phone` column — both are future additions

## Auth model

Two auth paths, both handled by `JwtAuthGuard`:

| Path            | Header                          | Used by                               |
| --------------- | ------------------------------- | ------------------------------------- |
| Service API key | `X-Api-Key: <key>`              | Dashboard (service mode), worker, bot |
| Human JWT       | `Authorization: Bearer <token>` | Dashboard (after login), pos-web      |

Store context is resolved from `X-Store-Id` header → JWT claim → default.

## Realtime

Socket.IO server at `ws://localhost:3000/ws/realtime`.

Rooms:

- `dashboard` — broadcast to all dashboard clients
- `store:{storeId}` — store-specific events

Event names are defined in `libs/contracts/src/events/index.ts`.

## Environment variables

Key variables in `apps/api/.env`:

| Variable             | Purpose                             |
| -------------------- | ----------------------------------- |
| `PORT`               | API port (default 3000)             |
| `DATABASE_URL`       | SQLite path or PostgreSQL URL       |
| `JWT_SECRET`         | Access token signing key            |
| `JWT_REFRESH_SECRET` | Refresh token signing key           |
| `BOT_API_KEY`        | Service key for bot→API calls       |
| `WORKER_API_KEY`     | Service key for worker→API calls    |
| `DASHBOARD_API_KEY`  | Service key for dashboard→API calls |
| `AUTH_DISABLED`      | Set to `true` to bypass auth in dev |
| `FONNTE_TOKEN`       | Fonnte WhatsApp API token           |
| `GEMINI_MODEL`       | Gemini model name                   |

Dashboard env in `apps/dashboard/.env`:

| Variable                 | Purpose                               |
| ------------------------ | ------------------------------------- |
| `VITE_DASHBOARD_API_KEY` | Must match `DASHBOARD_API_KEY` in API |
| `VITE_DEFAULT_STORE_ID`  | Store context for API requests        |
| `VITE_API_BASE`          | API base URL (empty = use Vite proxy) |
