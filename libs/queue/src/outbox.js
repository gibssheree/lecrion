"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeToOutbox = writeToOutbox;
exports.writeToOutboxBestEffort = writeToOutboxBestEffort;
const logger_1 = require("../../common/src/logger");
const logger = (0, logger_1.createServiceLogger)("api").child({ component: "outbox" });
async function writeToOutbox(tx, eventType, payload, meta = {}) {
    const { storeId = "default-store", tenantId = "default", source = "api", correlationId, aggregateId, } = meta;
    await tx.sync_outbox.create({
        data: {
            event_type: eventType,
            payload: JSON.stringify({
                event_type: eventType,
                aggregate_id: aggregateId ?? String(payload.orderId ?? payload.id ?? ""),
                store_id: storeId,
                tenant_id: tenantId,
                source,
                version: 1,
                occurred_at: new Date().toISOString(),
                correlation_id: correlationId ?? null,
                payload,
            }),
            status: "pending",
            created_at: new Date().toISOString(),
        },
    });
}
async function writeToOutboxBestEffort(prisma, eventType, payload, meta = {}) {
    try {
        await writeToOutbox(prisma, eventType, payload, meta);
    }
    catch (err) {
        logger.warn(`Best-effort outbox write failed: ${err.message}`, {
            eventType,
        });
    }
}
//# sourceMappingURL=outbox.js.map