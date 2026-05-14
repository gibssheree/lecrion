// apps/worker/src/schedulers/readModelScheduler.ts
//
// Delegates all projection SQL to libs/db/src/projections.ts — the single
// source of truth shared with the API's ReadModelService.
// No SQL is duplicated here.

import { PrismaService } from "../../../../libs/db/src/prisma";
import {
  rebuildProjections,
  ALL_PROJECTION_NAMES,
} from "../../../../libs/db/src/projections";
import { schedulerLogger } from "../telemetry/logger";

const INTERVAL_MS = Number(process.env["READ_MODEL_INTERVAL_MS"]) || 60_000;

let _running = false;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _prisma: PrismaService;

export function initReadModelScheduler(prisma: PrismaService): void {
  _prisma = prisma;
}

async function runRebuild(): Promise<void> {
  const start = Date.now();

  const { rebuilt, failed } = await rebuildProjections(
    _prisma,
    ALL_PROJECTION_NAMES,
    (name, err) => {
      schedulerLogger.warn(`Projection rebuild failed: ${name}`, {
        error: err.message,
      });
    },
  );

  schedulerLogger.info("Read models rebuilt", {
    durationMs: Date.now() - start,
    rebuilt: rebuilt.length,
    failed: failed.length,
    ...(failed.length ? { failedNames: failed } : {}),
  });
}

export function startReadModelScheduler(): void {
  if (_running) return;
  _running = true;
  schedulerLogger.info("Read-model scheduler started", {
    intervalMs: INTERVAL_MS,
    projections: ALL_PROJECTION_NAMES,
  });

  // Run immediately on start, then on interval
  runRebuild().catch((err) =>
    schedulerLogger.exception(err, { context: "initial read model rebuild" }),
  );

  const tick = () => {
    runRebuild()
      .catch((err) =>
        schedulerLogger.exception(err, { context: "read model rebuild" }),
      )
      .finally(() => {
        if (_running) _timer = setTimeout(tick, INTERVAL_MS);
      });
  };
  _timer = setTimeout(tick, INTERVAL_MS);
}

export function stopReadModelScheduler(): void {
  _running = false;
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
}
