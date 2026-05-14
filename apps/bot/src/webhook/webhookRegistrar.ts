// apps/bot/src/webhook/webhookRegistrar.ts
// Typed webhook registrar — replaces apps/bot/src/main.js

import { PrismaService } from "../../../../libs/db/src/prisma";
import { isDuplicate, setPrisma } from "../dedupe/webhookDedupe";
import {
  shouldProcessGroupMessage,
  getUserWaIdentity,
  extractDigits,
  isPrefixTriggeredGroupMessage,
  GroupConfig,
} from "./groupGuard";
import { sendFonnteMessage } from "./fonnteTransport";
import { botLogger } from "../telemetry/logger";

export interface BotConfig {
  fonnteToken: string;
  webhookSecret?: string;
  groupConfig: GroupConfig;
}

export interface DispatchContext {
  userMessage: string;
  sender: string;
  conversationSender: string;
  resolvedName: string | null;
  userWaIdentity: string;
  imageUrl: string | null;
  isgroup: boolean;
}

export type MessageDispatcher = (
  ctx: DispatchContext,
) => Promise<{
  reply: string;
  entryType: string;
  orderId?: number;
  totalPrice?: number;
  cartItems?: any[];
}>;
export type HistoryRecorder = (data: {
  sender: string;
  name?: string | null;
  question: string;
  reply: string;
  type?: string;
  orderId?: number | null;
  totalPrice?: number | null;
  cartItems?: any[] | null;
}) => Promise<void>;

/**
 * Register the Fonnte webhook handler onto an Express app.
 * Fully typed — no more require() calls to JS files.
 */
export function registerFonnteWebhook(
  app: any,
  config: BotConfig,
  dispatch: MessageDispatcher,
  recordHistory: HistoryRecorder,
  prisma: PrismaService,
): void {
  setPrisma(prisma);

  app.post("/fonnte-webhook", async (req: any, res: any) => {
    botLogger.debug("Incoming from Fonnte", { body: req.body });

    // 1. Optional webhook secret verification
    if (config.webhookSecret) {
      const provided = req.headers["x-webhook-secret"] ?? req.query?.secret;
      if (provided !== config.webhookSecret) {
        botLogger.warn("Unauthorized webhook attempt", { ip: req.ip });
        return res.status(401).json({ status: "unauthorized" });
      }
    }

    const {
      sender,
      message,
      name,
      pushname,
      contact_name: contactName,
      url,
      timestamp,
      isgroup,
    } = req.body ?? {};
    const userMessage = String(message ?? "").trim();

    if (!sender || !userMessage)
      return res.status(200).json({ status: "ignored" });

    // 2. Group guard
    if (!shouldProcessGroupMessage(req.body, userMessage, config.groupConfig)) {
      return res.status(200).json({ status: "ignored_group_not_tagged" });
    }

    // 3. DB-backed deduplication
    const dedupKey = `${sender}-${timestamp ?? userMessage}`;
    if (await isDuplicate(dedupKey)) {
      botLogger.debug("Duplicate message ignored", { dedupKey });
      return res.status(200).json({ status: "ignored_duplicate" });
    }

    // 4. Respond immediately
    res.json({ status: "ok" });

    // 5. Async processing (fire-and-forget)
    (async () => {
      const resolvedName = name ?? pushname ?? contactName ?? null;
      const userWaIdentity = getUserWaIdentity(req.body);
      const conversationSender = isgroup
        ? `${sender}:${extractDigits(req.body.member ?? req.body.memberlid ?? resolvedName ?? "unknown")}`
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

        if (!result?.reply) throw new Error("Empty reply generated");

        await sendFonnteMessage(sender, result.reply, config.fonnteToken);

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
      } catch (err: any) {
        botLogger.exception(err, { sender, context: "webhook dispatch" });
        try {
          await sendFonnteMessage(
            sender,
            "Maaf, terjadi kendala saat memproses pesan. Silakan ulangi beberapa saat lagi.",
            config.fonnteToken,
          );
        } catch (sendErr: any) {
          botLogger.warn(
            `Failed to send error notification: ${sendErr.message}`,
          );
        }
      }
    })();
  });
}
