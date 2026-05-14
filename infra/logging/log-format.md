# Observability and Logging Layout

**Phase 2 definition — docs_plan/07-ultimate-tasks.md**
**Based on: docs_plan/05-security-ops.md § Observability**

---

## Log Format

All services emit **JSON logs**, one object per line, to stdout/stderr.

```json
{
  "ts":            "2026-05-12T07:00:00.000Z",
  "level":         "info",
  "service":       "api",
  "component":     "webhook",
  "correlationId": "req-1234567-42",
  "message":       "Webhook received",
  "sender":        "62812345678",
  "msgLen":        24,
  "durationMs":    5
}
```

### Field definitions

| Field | Required | Description |
|---|---|---|
| `ts` | ✅ | ISO 8601 timestamp |
| `level` | ✅ | `error` \| `warn` \| `info` \| `debug` |
| `service` | ✅ | `api` \| `bot` \| `worker` \| `dashboard` \| `pos-web` |
| `component` | — | Sub-component: `webhook`, `intent`, `command`, `scheduler`, `outbox` |
| `correlationId` | — | Trace ID across services (from `X-Correlation-Id` header) |
| `message` | ✅ | Human-readable log message |
| `durationMs` | — | Duration in milliseconds for timed operations |
| `errorName` | — | Error class name (e.g. `ValidationError`) |
| `stack` | — | Error stack trace (truncated to 800 chars) |
| `statusCode` | — | HTTP status code for request logs |

### Sensitive field redaction

The following fields are **always redacted** to `[REDACTED]` before output:

```
password, passwd, token, apiKey, api_key, secret,
authorization, FONNTE_TOKEN, GEMINI_API_KEY, VERTEX_API_KEYS,
POS_PROVIDER_API_KEY, WEBHOOK_SECRET
```

---

## Log Levels

| Level | When to use |
|---|---|
| `error` | Unhandled exceptions, critical failures (DB down, payment failed, crash) |
| `warn` | Recoverable issues (LLM retry, outbox backlog, dedupe dropped) |
| `info` | Normal operations (order created, webhook received, scheduler ran) |
| `debug` | High-frequency internals — **disabled in production** (set `LOG_LEVEL=info`) |

Control with env: `LOG_LEVEL=debug` (default: `info`)

---

## Per-App Observability Layout

```
apps/
  api/
    src/
      health.js                       ← GET /health (DB ping + outbox check)
      middleware/
        requestLogger.js              ← HTTP request/response logger
        validate.js                   ← Validation error handler
  bot/
    src/
      telemetry/
        logger.js                     ← botLogger, webhookLogger, intentLogger
  worker/
    src/
      telemetry/
        logger.js                     ← workerLogger, schedulerLogger, outboxLogger
libs/
  common/
    src/
      logger/
        structured-logger.js          ← Core JSON logger implementation
        index.js                      ← getLogger(service) public API
      health/
        index.js                      ← createHealthRegistry()
      telemetry/
        metrics.js                    ← counter/gauge/histogram + pre-defined metrics
infra/
  logging/
    log-format.md                     ← This file
    alerts.yml                        ← Alert rules (see below)
```

---

## Health Check Endpoints

Every HTTP service exposes `GET /health`:

### API (`http://localhost:3000/health`)

```json
{
  "status":   "ok",
  "service":  "api",
  "uptime":   3600,
  "memoryMb": 128,
  "checks": {
    "db":     { "status": "ok",   "latencyMs": 3 },
    "outbox": { "status": "ok",   "latencyMs": 1 }
  }
}
```

### Dashboard (`http://localhost:3001/health`)

```json
{
  "status":   "ok",
  "service":  "dashboard",
  "uptime":   3600,
  "memoryMb": 64,
  "checks": {
    "api": { "status": "ok", "latencyMs": 15 }
  }
}
```

### Status codes

| Status | HTTP code | Meaning |
|---|---|---|
| `ok` | 200 | All checks passed |
| `degraded` | 200 | Non-critical check failed — system works but monitor |
| `unhealthy` | 503 | Critical check failed — restart service |

---

## Metrics (Prometheus format at `GET /metrics`)

| Metric | Type | Description |
|---|---|---|
| `lecrion_webhook_received_total` | counter | Fonnte webhooks received |
| `lecrion_webhook_deduped_total` | counter | Duplicate webhooks dropped |
| `lecrion_webhook_errors_total` | counter | Webhook processing errors |
| `lecrion_orders_created_total` | counter | Orders successfully created |
| `lecrion_orders_failed_total` | counter | Order creation failures |
| `lecrion_checkout_duration_ms` | histogram | Checkout end-to-end duration |
| `lecrion_llm_requests_total` | counter | LLM API requests |
| `lecrion_llm_errors_total` | counter | LLM API errors |
| `lecrion_llm_duration_ms` | histogram | LLM response duration |
| `lecrion_llm_blocked_total` | counter | LLM replies blocked by guardrails |
| `lecrion_ws_connections` | gauge | Active WebSocket connections |
| `lecrion_outbox_pending` | gauge | Pending events in sync_outbox |
| `lecrion_outbox_processed_total` | counter | Outbox events processed |
| `lecrion_db_query_duration_ms` | histogram | DB query duration |
| `lecrion_db_errors_total` | counter | DB query errors |

---

## Useful Alerts (from docs_plan/05-security-ops.md)

| Alert | Condition | Severity |
|---|---|---|
| Webhook failure spike | `webhook_errors_total` rate > 5/min | critical |
| Queue backlog growth | `outbox_pending` > 100 | warning |
| DB connection error | `db_errors_total` rate > 0 | critical |
| Stock deduction failure | `orders_failed_total` rate > 0 | critical |
| LLM error rate | `llm_errors_total / llm_requests_total` > 10% | warning |
| High LLM latency | `llm_duration_ms` p99 > 5000 | warning |
| Realtime disconnect storm | `ws_connections` drops > 50% in 60s | warning |
| High memory usage | process `memoryMb` > 512 | warning |

---

## Correlation ID Flow

```
Client Request
  → X-Correlation-Id: req-123 (or auto-generated by correlationIdMiddleware)
    → API logs: { correlationId: "req-123", ... }
    → Bot processes: passes correlationId in internal calls
    → Outbox event: { correlation_id: "req-123", ... }
    → Worker processes: logs with same correlationId
```

Use `X-Correlation-Id` header to trace a request across all service logs.

---

## Disabling Debug Logs in Production

```env
LOG_LEVEL=info   # Only info, warn, error
```

For development:

```env
LOG_LEVEL=debug  # All levels
```
