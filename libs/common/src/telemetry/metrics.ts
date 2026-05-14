// libs/common/src/telemetry/metrics.ts
// In-process metrics — Prometheus text format 0.0.4 compatible.
//
// Limitations vs a full Prometheus client:
//   - No label cardinality tracking
//   - No process/GC metrics
//   - Single-process only (no multi-process aggregation)
// These are acceptable for a single-node deployment. Replace with
// prom-client when moving to a multi-instance setup.

const _counters = new Map<
  string,
  { help: string; labelSets: Map<string, number> }
>();
const _gauges = new Map<string, { help: string; value: number }>();
const _histos = new Map<
  string,
  {
    help: string;
    sum: number;
    count: number;
    buckets: Map<number, number>; // le → cumulative count
    bucketBounds: number[];
  }
>();

// ── Counter ───────────────────────────────────────────────────────────────────

export function counter(name: string, help = "") {
  if (!_counters.has(name)) {
    _counters.set(name, { help, labelSets: new Map() });
  }
  return {
    inc(labels: Record<string, string> = {}, amount = 1) {
      const key = labelsToString(labels);
      const c = _counters.get(name)!;
      c.labelSets.set(key, (c.labelSets.get(key) ?? 0) + amount);
    },
    reset() {
      _counters.get(name)!.labelSets.clear();
    },
  };
}

// ── Gauge ─────────────────────────────────────────────────────────────────────

export function gauge(name: string, help = "") {
  if (!_gauges.has(name)) _gauges.set(name, { help, value: 0 });
  return {
    set(value: number) {
      _gauges.get(name)!.value = value;
    },
    inc(amount = 1) {
      _gauges.get(name)!.value += amount;
    },
    dec(amount = 1) {
      _gauges.get(name)!.value -= amount;
    },
    get() {
      return _gauges.get(name)!.value;
    },
  };
}

// ── Histogram ─────────────────────────────────────────────────────────────────

const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

export function histogram(
  name: string,
  help = "",
  bucketBounds = DEFAULT_BUCKETS,
) {
  if (!_histos.has(name)) {
    const sorted = [...bucketBounds].sort((a, b) => a - b);
    _histos.set(name, {
      help,
      sum: 0,
      count: 0,
      buckets: new Map(sorted.map((b) => [b, 0])),
      bucketBounds: sorted,
    });
  }
  return {
    observe(value: number) {
      const h = _histos.get(name)!;
      h.sum += value;
      h.count += 1;
      // Cumulative: increment all buckets where le >= value
      for (const bound of h.bucketBounds) {
        if (value <= bound) {
          h.buckets.set(bound, (h.buckets.get(bound) ?? 0) + 1);
        }
      }
    },
    async measure<T>(fn: () => Promise<T>): Promise<T> {
      const start = Date.now();
      try {
        return await fn();
      } finally {
        this.observe(Date.now() - start);
      }
    },
  };
}

// ── Pre-defined application metrics ──────────────────────────────────────────

export const metrics = {
  webhookReceived: counter(
    "lecrion_webhook_received_total",
    "Fonnte webhooks received",
  ),
  webhookDeduped: counter(
    "lecrion_webhook_deduped_total",
    "Duplicate webhooks dropped",
  ),
  webhookErrors: counter(
    "lecrion_webhook_errors_total",
    "Webhook processing errors",
  ),
  ordersCreated: counter(
    "lecrion_orders_created_total",
    "Orders successfully created",
  ),
  ordersFailed: counter(
    "lecrion_orders_failed_total",
    "Order creation failures",
  ),
  checkoutLatency: histogram(
    "lecrion_checkout_duration_ms",
    "Checkout end-to-end duration in ms",
  ),
  llmRequests: counter("lecrion_llm_requests_total", "LLM API requests"),
  llmErrors: counter("lecrion_llm_errors_total", "LLM API errors"),
  llmLatency: histogram(
    "lecrion_llm_duration_ms",
    "LLM response duration in ms",
  ),
  llmBlockedReplies: counter(
    "lecrion_llm_blocked_total",
    "LLM replies blocked by guardrails",
  ),
  wsConnections: gauge(
    "lecrion_ws_connections",
    "Active WebSocket connections",
  ),
  outboxPending: gauge(
    "lecrion_outbox_pending",
    "Pending events in sync_outbox",
  ),
  outboxProcessed: counter(
    "lecrion_outbox_processed_total",
    "Outbox events processed",
  ),
  httpRequestDuration: histogram(
    "lecrion_http_request_duration_ms",
    "HTTP request duration in ms",
  ),
  dbQueryLatency: histogram(
    "lecrion_db_query_duration_ms",
    "DB query duration in ms",
  ),
  dbErrors: counter("lecrion_db_errors_total", "DB query errors"),
};

// ── Prometheus text format renderer ──────────────────────────────────────────

/**
 * Render all metrics in Prometheus text format 0.0.4.
 * Suitable for scraping by Prometheus or compatible tools.
 */
export function renderMetrics(): string {
  const lines: string[] = [];

  // Counters
  for (const [name, { help, labelSets }] of _counters) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);
    if (labelSets.size === 0) {
      lines.push(`${name} 0`);
    } else {
      for (const [labelStr, value] of labelSets) {
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
  }

  // Gauges
  for (const [name, { help, value }] of _gauges) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  }

  // Histograms — must include _bucket{le="..."}, _sum, _count
  for (const [name, { help, sum, count, buckets, bucketBounds }] of _histos) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} histogram`);

    // Cumulative bucket lines (required by Prometheus spec)
    let cumulative = 0;
    for (const bound of bucketBounds) {
      cumulative += buckets.get(bound) ?? 0;
      lines.push(`${name}_bucket{le="${bound}"} ${cumulative}`);
    }
    // +Inf bucket = total count
    lines.push(`${name}_bucket{le="+Inf"} ${count}`);
    lines.push(`${name}_sum ${sum}`);
    lines.push(`${name}_count ${count}`);
  }

  return lines.join("\n") + "\n";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a label object to a Prometheus label string.
 * {} → "" (no labels, no braces)
 * { method: "GET", status: "200" } → '{method="GET",status="200"}'
 */
function labelsToString(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  const inner = entries.map(([k, v]) => `${k}="${v}"`).join(",");
  return `{${inner}}`;
}
