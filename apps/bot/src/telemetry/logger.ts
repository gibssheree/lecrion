// apps/bot/src/telemetry/logger.ts
import { createServiceLogger } from "../../../../libs/common/src/logger";

export const botLogger = createServiceLogger("bot");
export const webhookLogger = botLogger.child({ component: "webhook" });
export const intentLogger = botLogger.child({ component: "intent" });
export const commandLogger = botLogger.child({ component: "command" });
export const llmLogger = botLogger.child({ component: "llm" });
