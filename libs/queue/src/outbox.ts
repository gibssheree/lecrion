// libs/queue/src/outbox.ts
// Outbox pattern helper — per docs_plan/04-data-events.md

/**
 * Write an event to the sync_outbox table.
 * Pass either a Prisma transaction client (tx) or the top-level PrismaService.
 */
export async function writeToOutbox(
  tx: any,
  eventType: string,
  payload: Record<string, any>,
): Promise<void> {
  try {
    await tx.sync_outbox.create({
      data: {
        event_type: eventType,
        payload: JSON.stringify({
          event_type: eventType,
          aggregate_id: String(payload.orderId ?? payload.id ?? ""),
          source: payload.source ?? "api",
          version: 1,
          occurred_at: new Date().toISOString(),
          payload,
        }),
        status: "pending",
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.warn(`[Outbox] write failed: ${err.message}`, { eventType });
  }
}
