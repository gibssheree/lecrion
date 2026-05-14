// apps/worker/src/telemetry/logger.ts
import { createServiceLogger } from "../../../../libs/common/src/logger";

export const workerLogger = createServiceLogger("worker");
export const schedulerLogger = workerLogger.child({ component: "scheduler" });
export const outboxLogger = workerLogger.child({ component: "outbox" });
