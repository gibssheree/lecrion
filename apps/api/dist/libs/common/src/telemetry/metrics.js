"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
exports.counter = counter;
exports.gauge = gauge;
exports.histogram = histogram;
exports.renderMetrics = renderMetrics;
const _counters = new Map();
const _gauges = new Map();
const _histos = new Map();
function counter(name, help = "") {
    if (!_counters.has(name)) {
        _counters.set(name, { help, labelSets: new Map() });
    }
    return {
        inc(labels = {}, amount = 1) {
            const key = labelsToString(labels);
            const c = _counters.get(name);
            c.labelSets.set(key, (c.labelSets.get(key) ?? 0) + amount);
        },
        reset() {
            _counters.get(name).labelSets.clear();
        },
    };
}
function gauge(name, help = "") {
    if (!_gauges.has(name))
        _gauges.set(name, { help, value: 0 });
    return {
        set(value) {
            _gauges.get(name).value = value;
        },
        inc(amount = 1) {
            _gauges.get(name).value += amount;
        },
        dec(amount = 1) {
            _gauges.get(name).value -= amount;
        },
        get() {
            return _gauges.get(name).value;
        },
    };
}
const DEFAULT_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
function histogram(name, help = "", bucketBounds = DEFAULT_BUCKETS) {
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
        observe(value) {
            const h = _histos.get(name);
            h.sum += value;
            h.count += 1;
            for (const bound of h.bucketBounds) {
                if (value <= bound) {
                    h.buckets.set(bound, (h.buckets.get(bound) ?? 0) + 1);
                }
            }
        },
        async measure(fn) {
            const start = Date.now();
            try {
                return await fn();
            }
            finally {
                this.observe(Date.now() - start);
            }
        },
    };
}
exports.metrics = {
    webhookReceived: counter("lecrion_webhook_received_total", "Fonnte webhooks received"),
    webhookDeduped: counter("lecrion_webhook_deduped_total", "Duplicate webhooks dropped"),
    webhookErrors: counter("lecrion_webhook_errors_total", "Webhook processing errors"),
    ordersCreated: counter("lecrion_orders_created_total", "Orders successfully created"),
    ordersFailed: counter("lecrion_orders_failed_total", "Order creation failures"),
    checkoutLatency: histogram("lecrion_checkout_duration_ms", "Checkout end-to-end duration in ms"),
    llmRequests: counter("lecrion_llm_requests_total", "LLM API requests"),
    llmErrors: counter("lecrion_llm_errors_total", "LLM API errors"),
    llmLatency: histogram("lecrion_llm_duration_ms", "LLM response duration in ms"),
    llmBlockedReplies: counter("lecrion_llm_blocked_total", "LLM replies blocked by guardrails"),
    wsConnections: gauge("lecrion_ws_connections", "Active WebSocket connections"),
    outboxPending: gauge("lecrion_outbox_pending", "Pending events in sync_outbox"),
    outboxProcessed: counter("lecrion_outbox_processed_total", "Outbox events processed"),
    httpRequestDuration: histogram("lecrion_http_request_duration_ms", "HTTP request duration in ms"),
    dbQueryLatency: histogram("lecrion_db_query_duration_ms", "DB query duration in ms"),
    dbErrors: counter("lecrion_db_errors_total", "DB query errors"),
};
function renderMetrics() {
    const lines = [];
    for (const [name, { help, labelSets }] of _counters) {
        lines.push(`# HELP ${name} ${help}`);
        lines.push(`# TYPE ${name} counter`);
        if (labelSets.size === 0) {
            lines.push(`${name} 0`);
        }
        else {
            for (const [labelStr, value] of labelSets) {
                lines.push(`${name}${labelStr} ${value}`);
            }
        }
    }
    for (const [name, { help, value }] of _gauges) {
        lines.push(`# HELP ${name} ${help}`);
        lines.push(`# TYPE ${name} gauge`);
        lines.push(`${name} ${value}`);
    }
    for (const [name, { help, sum, count, buckets, bucketBounds }] of _histos) {
        lines.push(`# HELP ${name} ${help}`);
        lines.push(`# TYPE ${name} histogram`);
        let cumulative = 0;
        for (const bound of bucketBounds) {
            cumulative += buckets.get(bound) ?? 0;
            lines.push(`${name}_bucket{le="${bound}"} ${cumulative}`);
        }
        lines.push(`${name}_bucket{le="+Inf"} ${count}`);
        lines.push(`${name}_sum ${sum}`);
        lines.push(`${name}_count ${count}`);
    }
    return lines.join("\n") + "\n";
}
function labelsToString(labels) {
    const entries = Object.entries(labels);
    if (entries.length === 0)
        return "";
    const inner = entries.map(([k, v]) => `${k}="${v}"`).join(",");
    return `{${inner}}`;
}
//# sourceMappingURL=metrics.js.map