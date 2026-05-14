# Security and Operations

## 1. Authentication Model

The target system should use different trust levels for humans and services.

### Human Users
- Access token for short-lived API calls
- Refresh token stored in httpOnly cookie or secure storage
- Role-based access control
- Tenant and store scoping on every request
- Human operator UIs live in `apps/dashboard` and, if split, `apps/pos-web`; `apps/bot` stays service-only.

### Service Accounts
- Separate credentials for bot, dashboard backend, worker, and webhook relay
- Signed service tokens or mTLS for internal calls if needed
- No shared admin credentials across services

### External Webhooks
- Fonnte webhook secret verification
- Payment callback signature verification
- Replay protection with idempotency keys and timestamp checks

## 2. Permission Model

Recommended roles:
- `owner`
- `manager`
- `cashier`
- `inventory_staff`
- `support`
- `bot_service`
- `worker_service`
- `llm_service`

Typical permissions:
- Owner: everything within tenant
- Manager: operations, reports, settings, approvals
- Cashier: register actions, checkout, refunds within policy
- Inventory staff: stock movement and product maintenance
- Support: chat review and limited corrections
- Bot service: command execution only through approved endpoints
- Worker service: background jobs only
- LLM service: read-only via tool layer

## 3. Validation Rules

Every write endpoint should enforce:
- DTO or schema validation
- Type coercion where safe
- Whitelist fields only
- No unknown keys if possible
- Size limits on text and payloads
- Numeric bounds for quantity, money, and stock

This prevents accidental sync issues and malformed writes.

## 4. Idempotency and Replay Defense

Use idempotency keys for:
- Checkout submissions
- Cashflow postings
- Webhook deliveries
- Payment callbacks
- Bot commands that create side effects

Store dedupe markers so the same inbound message or callback cannot create duplicate orders.

## 5. Audit Logging

Log every important mutation:
- Who changed it
- What changed
- Before and after values
- Tenant and store
- Request id or correlation id
- Source channel

Audit logs are mandatory for cashflow, stock, orders, and permission changes.

## 6. Realtime and Sync Protection

- Use optimistic locking or row locking on stock and cash register operations.
- Never allow the dashboard to patch local state without a server confirmation.
- Keep bot response generation asynchronous if it can wait for a safe commit.
- Use retries with exponential backoff for transient failures.
- Put failed events into a dead-letter queue.

## 7. LLM Guardrails

The LLM layer must stay in a constrained role.

Rules:
- It can suggest or summarize.
- It cannot directly execute writes.
- It must use tool calls with schema validation.
- Its output should be reviewed when it affects orders, stock, or cashflow.
- It must not see secrets, internal tokens, or raw admin credentials.

## 8. Observability

Minimum telemetry:
- Structured logs
- Correlation ids
- Queue depth metrics
- Webhook success and failure counters
- Order and payment latency metrics
- Realtime connection counts
- LLM error rate and latency

Useful alerts:
- Webhook failure spike
- Queue backlog growth
- DB connection exhaustion
- Stock deduction failures
- Payment callback mismatch
- Realtime disconnect storms

## 9. Deployment Notes

For production clients, use:
- Containerized deployment
- Environment secrets in a secret manager
- Health checks for API, worker, and dashboard
- Blue-green or rolling deploys
- Backup and restore verification
- Separate staging and production tenants

## 10. Operational Checklist

Before onboarding a client store:
- Tenant created
- Store settings configured
- Roles assigned
- Webhook secret set
- Payment callback verified
- Initial stock imported
- Register session policy configured
- Alerts and dashboards validated
- Backup schedule enabled

## 11. Minimum Error Strategy

To keep the system stable under multi-user usage:
- Fail fast on bad requests
- Commit atomically or rollback fully
- Publish events only after commit
- Keep bot replies short and deterministic for operational commands
- Use fallbacks for LLM outages
- Separate read paths from write paths
