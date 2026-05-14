// apps/worker/src/main.ts
import { PrismaService } from "../../../libs/db/src/prisma";
import { workerLogger } from "./telemetry/logger";
import {
  initOutboxProcessor,
  startOutboxProcessor,
  stopOutboxProcessor,
} from "./processors/outboxProcessor";
import {
  initLowStockScheduler,
  startLowStockScheduler,
} from "./schedulers/lowStockScheduler";
import {
  initReadModelScheduler,
  startReadModelScheduler,
  stopReadModelScheduler,
} from "./schedulers/readModelScheduler";

async function bootstrap(): Promise<void> {
  workerLogger.info("Worker starting...");

  const prisma = new PrismaService();
  await prisma.onModuleInit();

  // Inject Prisma into all schedulers/processors
  initOutboxProcessor(prisma);
  initLowStockScheduler(prisma);
  initReadModelScheduler(prisma);

  // Start in dependency order: outbox first (event delivery), then projections
  startOutboxProcessor();
  startLowStockScheduler();
  startReadModelScheduler();

  workerLogger.info("Worker ready", {
    schedulers: ["lowStockScheduler", "readModelScheduler"],
    processors: ["outboxProcessor"],
    pid: process.pid,
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  // Handle both SIGTERM (Docker/K8s) and SIGINT (Ctrl+C in dev)
  async function shutdown(signal: string): Promise<void> {
    workerLogger.info(`Worker shutting down (${signal})...`);

    // Stop schedulers first — prevents new work from starting
    stopOutboxProcessor();
    stopReadModelScheduler();

    // Disconnect DB — flushes any pending SQLite WAL writes
    await prisma.onModuleDestroy();

    workerLogger.info("Worker shutdown complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Catch unhandled rejections — log and exit so the process manager restarts
  process.on("unhandledRejection", (reason) => {
    workerLogger.error("Unhandled rejection — worker will exit", {
      reason: String(reason),
    });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error("Worker bootstrap failed:", err);
  process.exit(1);
});
