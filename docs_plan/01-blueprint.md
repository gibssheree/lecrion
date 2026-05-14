# Blueprint

## 1. Goal

Build a multi-tenant POS platform that can serve multiple store clients while keeping WhatsApp bot interactions, dashboard views, cash register actions, revenue reporting, and inventory updates synchronized in near real time.

The platform must support:
- Fast order creation and checkout
- Cashflow and revenue tracking
- Stock and stock movement logging
- Realtime chatbot and dashboard integration
- Multi-user access with role-based permissions
- Low error rates through validation, idempotency, and transaction boundaries

## 2. System Boundaries

### POS Core
The POS core owns the business truth.

Responsibilities:
- Product catalog
- Inventory balance
- Stock movements
- Orders and order items
- Payments and refunds
- Cashflow ledger
- Register sessions
- Audit log
- Tenant and user authorization
- Reporting read models

### Dashboard Chatbot
The dashboard chatbot is the admin and operator console.

Responsibilities:
- Live chat stream
- Message search and history
- Human override for bot replies
- Operational alerts
- Configuration management
- LLM prompt testing
- Store-level monitoring
- Realtime sales and stock widgets

### WhatsApp Chatbot
The WhatsApp chatbot is the external interaction channel.

Responsibilities:
- Receive inbound messages and webhooks
- Normalize intents
- Route commands to the POS core
- Return short operational responses
- Forward safe summaries from the LLM layer
- Deduplicate repeated webhook deliveries

### Frontend Applications
The user-facing web apps are separate from the WhatsApp bot service.

Responsibilities:
- apps/dashboard: admin and chatbot console
- apps/pos-web: cashier POS UI if a separate web POS is needed
- apps/bot: transport and command adapter only, no dashboard UI

## 3. Recommended Core Stack

- Backend framework: NestJS
- Language: TypeScript
- API style: REST plus WebSocket events
- Database: PostgreSQL preferred, MySQL acceptable for migration compatibility
- ORM: Prisma
- Queue: BullMQ
- Cache and pub/sub: Redis
- Realtime transport: Socket.IO
- Frontend apps: React + Vite for `apps/dashboard`, and `apps/pos-web` if the cashier UI is split
- Validation: class-validator or Zod
- Auth: JWT access tokens plus refresh tokens, or secure cookie sessions for operator UI

## 4. Data Ownership Rules

The following rules prevent sync drift:

1. The bot never writes directly to shared state outside a command service.
2. The dashboard never edits entities by mutating local state only.
3. The LLM never writes directly to the database.
4. All state changes pass through a command handler and a DB transaction.
5. Every committed mutation emits an event.
6. Every event can rebuild a read model or update a cache.

## 5. Sync Model

Use a transaction plus outbox pattern.

Flow:
1. Client sends command.
2. API validates auth, tenant, and payload.
3. Command handler opens DB transaction.
4. Domain tables are updated.
5. Outbox event is inserted in the same transaction.
6. Transaction commits.
7. Worker reads outbox and publishes event.
8. Socket.IO pushes update to dashboard and bot clients.
9. Read models and caches are refreshed.

This model prevents partial writes and keeps the bot and dashboard aligned.

## 6. Realtime Event Set

Core events:
- `order.created`
- `order.paid`
- `order.cancelled`
- `order.completed`
- `stock.reserved`
- `stock.released`
- `stock.adjusted`
- `cashflow.income.recorded`
- `cashflow.expense.recorded`
- `register.opened`
- `register.closed`
- `chatbot.message.received`
- `chatbot.reply.sent`
- `config.updated`
- `llm.response.generated`
- `audit.recorded`

## 7. Multi-Tenant Model

Every business object must include `tenant_id` or `store_id`.

Isolation rules:
- Queries are always filtered by tenant/store.
- Realtime channels are namespaced per store.
- Cache keys are namespaced per store.
- Audit logs include tenant and actor.
- Background jobs carry tenant context.

## 8. Performance Rules

- Read traffic should use cached projections, not raw joins for every UI refresh.
- Write traffic should stay transactional and minimal.
- Reporting should use aggregates and summary tables for expensive views.
- Inventory counts should be based on ledger movement, not manual recalculation in UI.
- Webhook handlers should return quickly and finish heavy work in queue jobs.

## 9. Error Minimization Rules

- Validate all inputs at the edge.
- Reject duplicate requests with idempotency keys.
- Use optimistic concurrency or row locks for inventory and cash register operations.
- Persist dedupe markers for inbound webhook deliveries.
- Keep audit logs for all mutating operations.
- Use structured error codes instead of free-form strings.

## 10. Non-Goals

The target system should not rely on:
- In-memory cart state as the only source of truth
- Local dashboard config files for operational settings
- LLM-generated database writes without validation
- Tight coupling between UI and DB tables
- Shared mutable state across bot and dashboard processes
