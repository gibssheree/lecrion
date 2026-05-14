"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
exports.redact = redact;
exports.createServiceLogger = createServiceLogger;
const REDACTED_KEYS = new Set([
    "password",
    "passwd",
    "token",
    "apiKey",
    "api_key",
    "secret",
    "authorization",
    "FONNTE_TOKEN",
    "GEMINI_API_KEY",
    "VERTEX_API_KEYS",
]);
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
function redact(obj, depth = 0) {
    if (depth > 4 || obj === null || typeof obj !== "object")
        return obj;
    if (Array.isArray(obj))
        return obj.map((v) => redact(v, depth + 1));
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (REDACTED_KEYS.has(k) || REDACTED_KEYS.has(k.toLowerCase())) {
            out[k] = "[REDACTED]";
        }
        else if (v && typeof v === "object") {
            out[k] = redact(v, depth + 1);
        }
        else {
            out[k] = v;
        }
    }
    return out;
}
function createServiceLogger(serviceName, defaultMeta = {}) {
    let _correlationId = null;
    const minLevel = LOG_LEVELS[process.env["LOG_LEVEL"] ?? "info"] ?? LOG_LEVELS["info"];
    function log(level, message, meta = {}) {
        if (LOG_LEVELS[level] > minLevel)
            return;
        const entry = redact({
            ts: new Date().toISOString(),
            level,
            service: serviceName,
            correlationId: _correlationId ?? undefined,
            message,
            ...defaultMeta,
            ...meta,
        });
        const line = JSON.stringify(entry);
        if (level === "error")
            process.stderr.write(line + "\n");
        else
            process.stdout.write(line + "\n");
    }
    return {
        setCorrelationId(id) {
            _correlationId = id;
        },
        clearCorrelationId() {
            _correlationId = null;
        },
        error: (msg, meta) => log("error", msg, meta),
        warn: (msg, meta) => log("warn", msg, meta),
        info: (msg, meta) => log("info", msg, meta),
        debug: (msg, meta) => log("debug", msg, meta),
        child(childMeta) {
            return createServiceLogger(serviceName, { ...defaultMeta, ...childMeta });
        },
        exception(err, meta = {}) {
            log("error", err.message || "Unknown error", {
                ...meta,
                errorName: err.name,
                stack: err.stack?.slice(0, 800),
            });
        },
    };
}
const getLogger = (service) => createServiceLogger(service);
exports.getLogger = getLogger;
//# sourceMappingURL=index.js.map