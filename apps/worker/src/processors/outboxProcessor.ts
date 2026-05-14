// apps/worker/src/processors/outboxProcessor.ts
import { PrismaService } from "../../../../libs/db/src/prisma";
import { emitInboxEvent } from "../../../../libs/realtime/src/publishers";
import { schedulerLogger } from "../telemetry/logger";

const POLL_INTERVAL_MS = Number(process.env["OUTBOX_POLL_MS"]) || 5_000;
const MAX_ATTEMPTS = 5;

// Rows stuck in 'processing' for longer than this are considered crashed
// and reset to 'pending' for retry.
const STUCK_THRESHOLD_MS = 60_000;

let _running = false;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _prisma: PrismaService;

export function initOutboxProcessor(prisma: PrismaService): void {
  _prisma = prisma;
}

function nextAttemptAt(attempts: number): string {
  // Exponential backoff: 10s, 20s, 40s, 80s, 160s
  const delaySecs = Math.pow(2, attempts) * 5;
  return new Date(Date.now() + delaySecs * 1000).toISOString();
}

/**
 * Reset rows stuck in 'processing' state — these are rows that were being
 * processed when the worker crashed. Reset them to 'pending' so they are
 * retried on the next poll cycle.
 */
async function recoverStuckRows(): Promise<void> {
  const stuckBefore = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();
  const stuck = await _prisma.sync_outbox.findMany({
    where: {
      status: "processing",
      created_at: { lte: stuckBefore },
    },
    take: 50,
  });

  if (stuck.length === 0) return;

  schedulerLogger.warn(`Recovering ${stuck.length} stuck outbox rows`, {
    ids: stuck.map((r) => r.id),
  });

  for (const row of stuck) {
    const attempts = (row.attempts ?? 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await _prisma.sync_outbox.update({
        where: { id: row.id },
        data: {
          status: "dead",
          last_error: "Stuck in processing — dead-lettered",
        },
      });
    } else {
      await _prisma.sync_outbox.update({
        where: { id: row.id },
        data: {
          status: "pending",
          attempts: { increment: 1 },
          last_error: "Recovered from stuck processing state",
          next_attempt_at: nextAttemptAt(attempts),
        },
      });
    }
  }
}

async function processEvent(row: {
  id: number;
  event_type: string;
  payload: string;
  attempts: number;
}): Promise<boolean> {
  try {
    // Mark as processing — if we crash here, recoverStuckRows() will reset it
    await _prisma.sync_outbox.update({
      where: { id: row.id },
      data: { status: "processing" },
    });

    // Write to inbox and mark outbox as processed atomically
    // Using $transaction ensures both writes succeed or both roll back
    const inbox = await _prisma.$transaction(async (tx: any) => {
      const created = await tx.sync_inbox.create({
        data: {
          event_type: row.event_type,
          payload: row.payload,
          source_outbox_id: row.id,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      });

      await tx.sync_outbox.update({
        where: { id: row.id },
        data: { status: "processed", processed_at: new Date().toISOString() },
      });

      return created;
    });

    schedulerLogger.debug("Outbox event processed", {
      outboxId: row.id,
      event: row.event_type,
      inboxId: inbox.id,
    });

    // Extract store_id from the event payload for store-namespaced realtime emit
    let storeId: string | undefined;
    try {
      const parsed = JSON.parse(row.payload ?? "{}");
      storeId = parsed?.store_id ?? parsed?.payload?.storeId ?? undefined;
    } catch {
      // ignore malformed payload
    }

    emitInboxEvent({
      event_type: row.event_type,
      payload: row.payload,
      storeId,
    });
    return true;
  } catch (err: any) {
    const attempts = (row.attempts ?? 0) + 1;

    if (attempts >= MAX_ATTEMPTS) {
      await _prisma.sync_outbox
        .update({
          where: { id: row.id },
          data: {
            status: "dead",
            last_error: err.message,
            attempts,
          },
        })
        .catch(() => {}); // best-effort — don't throw on cleanup failure

      schedulerLogger.error("Outbox event dead-lettered", {
        outboxId: row.id,
        event: row.event_type,
        attempts,
        error: err.message,
      });
    } else {
      await _prisma.sync_outbox
        .update({
          where: { id: row.id },
          data: {
            status: "failed",
            attempts,
            last_error: err.message,
            next_attempt_at: nextAttemptAt(attempts),
          },
        })
        .catch(() => {}); // best-effort

      schedulerLogger.warn("Outbox event failed, will retry", {
        outboxId: row.id,
        event: row.event_type,
        attempts,
        nextRetry: nextAttemptAt(attempts),
      });
    }
    return false;
  }
}

async function tick(): Promise<void> {
  try {
    // Recover any rows stuck from a previous crash before processing new ones
    await recoverStuckRows();

    const now = new Date().toISOString();
    const rows = await _prisma.sync_outbox.findMany({
      where: {
        status: "pending",
        OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: now } }],
      },
      orderBy: { created_at: "asc" },
      take: 20,
    });

    if (rows.length > 0) {
      schedulerLogger.debug(`Outbox: processing ${rows.length} pending events`);
      for (const row of rows) {
        await processEvent(row as any);
      }
    }
  } catch (err: any) {
    schedulerLogger.exception(err, { context: "outbox poll" });
  }
}

export function startOutboxProcessor(): void {
  if (_running) return;
  _running = true;
  schedulerLogger.info("OutboxProcessor started", {
    pollIntervalMs: POLL_INTERVAL_MS,
    maxAttempts: MAX_ATTEMPTS,
    stuckThresholdMs: STUCK_THRESHOLD_MS,
  });

  const loop = () => {
    tick().finally(() => {
      if (_running) _timer = setTimeout(loop, POLL_INTERVAL_MS);
    });
  };
  loop();
}

export function stopOutboxProcessor(): void {
  _running = false;
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  schedulerLogger.info("OutboxProcessor stopped");
}
