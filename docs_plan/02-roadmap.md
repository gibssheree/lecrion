# Implementation Roadmap

## Phase 0. Discovery and Baseline

Goal:
- Freeze the current business rules and identify which flows must remain compatible.

Tasks:
- Inventory all current order, stock, reporting, bot, and dashboard flows.
- Map current files to future modules.
- Document existing DB tables and missing tables.
- Define tenant boundaries and roles.

Done when:
- Every current flow has a target owner.
- The future architecture has a single source of truth.

## Phase 1. Foundation

Goal:
- Establish a robust application skeleton.

Tasks:
- Create NestJS monorepo or modular app layout.
- Add Prisma schema and migration workflow.
- Add Redis and queue infrastructure.
- Add Socket.IO gateway and event namespace rules.
- Add auth, RBAC, tenant guard, and request validation.
- Add structured logging and correlation IDs.
- Create separate frontend app boundaries for `apps/dashboard` and optional `apps/pos-web`; keep them out of `apps/bot`.

Done when:
- API boots with auth, DB access, queue, and realtime channels.
- Shared types and event contracts are in place.

## Phase 2. POS Core

Goal:
- Implement the transactional business backbone.

Tasks:
- Product catalog module.
- Inventory ledger and stock movement module.
- Cart command module.
- Checkout and payment module.
- Cashflow ledger module.
- Register open/close session module.
- Revenue and reporting projections.
- Audit log module.

Done when:
- A cashier can create an order, pay it, update stock, and close the register without breaking sync.

## Phase 3. Chatbot Integration

Goal:
- Make the WhatsApp bot a safe command client of the POS core.

Tasks:
- Webhook adapter.
- Intent normalization.
- Command router.
- Webhook dedupe and replay defense.
- Shared catalog and order query endpoints.
- Bot response formatter.
- Low-latency event push to dashboard.

Done when:
- WhatsApp messages create or query POS data through the same core services used by the dashboard.

## Phase 4. Dashboard Chatbot

Goal:
- Build the operator console for live chat and supervision.

Tasks:
- Chat stream tab.
- Order tab.
- Cashflow tab.
- Inventory tab.
- LLM test and moderation tab.
- Config and feature flag tab.
- Live notification badges and event counters.
- If the cashier POS UI is split from the admin console, build it as `apps/pos-web`, not inside `apps/bot`.

Done when:
- Operators can monitor and override bot and POS behavior in real time.

## Phase 5. LLM Integration

Goal:
- Make the LLM useful without making it a source of truth.

Tasks:
- Tool-based LLM adapter.
- Prompt templates by role.
- Strict schema validation for LLM outputs.
- Redaction layer for sensitive fields.
- Fallback responses when the model is unavailable.
- Insight summarization jobs.

Done when:
- The LLM can summarize and assist, but cannot bypass business rules.

## Phase 6. Hardening and Rollout

Goal:
- Reduce production risk before client onboarding.

Tasks:
- Load testing for order and chat bursts.
- DB backup and restore drills.
- Realtime reconnect testing.
- Queue retry and dead-letter handling.
- End-to-end tests for bot, dashboard, and POS flows.
- Rollout by tenant or pilot store.

Done when:
- The platform survives network interruptions, duplicate webhooks, and concurrent cashier usage.

## Suggested Delivery Order

1. Foundation
2. POS core
3. Chatbot integration
4. Dashboard chatbot
5. LLM integration
6. Hardening

This order is chosen because the bot and dashboard become reliable only after the core transaction and event model is stable.
