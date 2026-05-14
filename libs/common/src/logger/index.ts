// libs/common/src/logger/index.ts

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

const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export function redact(obj: any, depth = 0): any {
  if (depth > 4 || obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(k) || REDACTED_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object") {
      out[k] = redact(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export interface ServiceLogger {
  error(msg: string, meta?: Record<string, any>): void;
  warn(msg: string, meta?: Record<string, any>): void;
  info(msg: string, meta?: Record<string, any>): void;
  debug(msg: string, meta?: Record<string, any>): void;
  child(childMeta: Record<string, any>): ServiceLogger;
  exception(err: Error, meta?: Record<string, any>): void;
  setCorrelationId(id: string): void;
  clearCorrelationId(): void;
}

export function createServiceLogger(
  serviceName: string,
  defaultMeta: Record<string, any> = {},
): ServiceLogger {
  let _correlationId: string | null = null;
  const minLevel =
    LOG_LEVELS[process.env["LOG_LEVEL"] ?? "info"] ?? LOG_LEVELS["info"];

  function log(
    level: string,
    message: string,
    meta: Record<string, any> = {},
  ): void {
    if (LOG_LEVELS[level] > minLevel) return;
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
    if (level === "error") process.stderr.write(line + "\n");
    else process.stdout.write(line + "\n");
  }

  return {
    setCorrelationId(id: string) {
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

export const getLogger = (service: string): ServiceLogger =>
  createServiceLogger(service);
