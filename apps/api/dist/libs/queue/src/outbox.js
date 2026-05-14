"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeToOutbox = writeToOutbox;
async function writeToOutbox(tx, eventType, payload) {
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
    }
    catch (err) {
        console.warn(`[Outbox] write failed: ${err.message}`, { eventType });
    }
}
//# sourceMappingURL=outbox.js.map