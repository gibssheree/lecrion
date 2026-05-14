"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPrisma = setPrisma;
exports.isDuplicate = isDuplicate;
const TTL_HOURS = 24;
let _prisma = null;
function setPrisma(prisma) {
    _prisma = prisma;
}
async function isDuplicate(msgId) {
    if (!msgId || !_prisma)
        return false;
    const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();
    const row = await _prisma.webhook_dedupes.findFirst({
        where: {
            dedupe_key: msgId,
            created_at: { gt: cutoff },
        },
    });
    if (row)
        return true;
    await _prisma.webhook_dedupes
        .upsert({
        where: { dedupe_key: msgId },
        update: { created_at: new Date().toISOString() },
        create: { dedupe_key: msgId, created_at: new Date().toISOString() },
    })
        .catch(() => { });
    if (Math.random() < 0.01) {
        _prisma.webhook_dedupes
            .deleteMany({ where: { created_at: { lt: cutoff } } })
            .catch(() => { });
    }
    return false;
}
//# sourceMappingURL=webhookDedupe.js.map