"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmLogger = exports.commandLogger = exports.intentLogger = exports.webhookLogger = exports.botLogger = void 0;
const logger_1 = require("../../../../libs/common/src/logger");
exports.botLogger = (0, logger_1.createServiceLogger)("bot");
exports.webhookLogger = exports.botLogger.child({ component: "webhook" });
exports.intentLogger = exports.botLogger.child({ component: "intent" });
exports.commandLogger = exports.botLogger.child({ component: "command" });
exports.llmLogger = exports.botLogger.child({ component: "llm" });
//# sourceMappingURL=logger.js.map