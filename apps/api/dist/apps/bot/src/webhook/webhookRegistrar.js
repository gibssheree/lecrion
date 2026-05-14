"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFonnteWebhook = registerFonnteWebhook;
const webhookDedupe_1 = require("../dedupe/webhookDedupe");
const groupGuard_1 = require("./groupGuard");
const fonnteTransport_1 = require("./fonnteTransport");
const logger_1 = require("../telemetry/logger");
function registerFonnteWebhook(app, config, dispatch, recordHistory, prisma) {
    (0, webhookDedupe_1.setPrisma)(prisma);
    app.post("/fonnte-webhook", async (req, res) => {
        logger_1.botLogger.debug("Incoming from Fonnte", { body: req.body });
        if (config.webhookSecret) {
            const provided = req.headers["x-webhook-secret"] ?? req.query?.secret;
            if (provided !== config.webhookSecret) {
                logger_1.botLogger.warn("Unauthorized webhook attempt", { ip: req.ip });
                return res.status(401).json({ status: "unauthorized" });
            }
        }
        const { sender, message, name, pushname, contact_name: contactName, url, timestamp, isgroup, } = req.body ?? {};
        const userMessage = String(message ?? "").trim();
        if (!sender || !userMessage)
            return res.status(200).json({ status: "ignored" });
        if (!(0, groupGuard_1.shouldProcessGroupMessage)(req.body, userMessage, config.groupConfig)) {
            return res.status(200).json({ status: "ignored_group_not_tagged" });
        }
        const dedupKey = `${sender}-${timestamp ?? userMessage}`;
        if (await (0, webhookDedupe_1.isDuplicate)(dedupKey)) {
            logger_1.botLogger.debug("Duplicate message ignored", { dedupKey });
            return res.status(200).json({ status: "ignored_duplicate" });
        }
        res.json({ status: "ok" });
        (async () => {
            const resolvedName = name ?? pushname ?? contactName ?? null;
            const userWaIdentity = (0, groupGuard_1.getUserWaIdentity)(req.body);
            const conversationSender = isgroup
                ? `${sender}:${(0, groupGuard_1.extractDigits)(req.body.member ?? req.body.memberlid ?? resolvedName ?? "unknown")}`
                : sender;
            try {
                const result = await dispatch({
                    userMessage,
                    sender,
                    conversationSender,
                    resolvedName,
                    userWaIdentity,
                    imageUrl: url ?? null,
                    isgroup: Boolean(isgroup),
                });
                if (!result?.reply)
                    throw new Error("Empty reply generated");
                await (0, fonnteTransport_1.sendFonnteMessage)(sender, result.reply, config.fonnteToken);
                await recordHistory({
                    sender: conversationSender,
                    name: resolvedName,
                    question: userMessage,
                    reply: result.reply,
                    type: result.entryType ?? "chat",
                    orderId: result.orderId ?? null,
                    totalPrice: result.totalPrice ?? null,
                    cartItems: result.cartItems ?? null,
                });
            }
            catch (err) {
                logger_1.botLogger.exception(err, { sender, context: "webhook dispatch" });
                try {
                    await (0, fonnteTransport_1.sendFonnteMessage)(sender, "Maaf, terjadi kendala saat memproses pesan. Silakan ulangi beberapa saat lagi.", config.fonnteToken);
                }
                catch (sendErr) {
                    logger_1.botLogger.warn(`Failed to send error notification: ${sendErr.message}`);
                }
            }
        })();
    });
}
//# sourceMappingURL=webhookRegistrar.js.map