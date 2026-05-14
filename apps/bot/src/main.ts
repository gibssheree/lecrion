// apps/bot/src/main.ts
//
// ── Ownership decision (P5-1) ────────────────────────────────────────────────
//
// apps/bot is a UTILITY BUNDLE, not a standalone runnable service.
//
// Webhook intake:   apps/api/src/modules/bot/bot.controller.ts
//                   POST /api/bot/webhook — the single active webhook path.
//
// Message dispatch: apps/api/src/modules/bot/bot-dispatch.service.ts
//                   Routes intents to POS core services.
//
// Bot utilities:    apps/bot/src/ — imported by the API via @bot/* path alias.
//   - intents/     Intent detection (intentDetector, ingredientIntent, reportIntent)
//   - formatters/  Reply formatters (menuFormatter, ingredientFormatter, reportFormatter)
//   - webhook/     Transport helpers (groupGuard, fonnteTransport)
//   - dedupe/      Webhook deduplication (webhookDedupe)
//
// webhookRegistrar.ts is a LEGACY Express registrar from the pre-NestJS era.
// It is NOT used in the current runtime. It is kept for reference only.
// Do not add new logic to it. If a standalone bot process is needed in the
// future, create a new NestJS app that imports BotDispatchService from the API.
//
// ─────────────────────────────────────────────────────────────────────────────

// Re-export utility types for consumers
export type {
  DispatchContext,
  MessageDispatcher,
  HistoryRecorder,
} from "./webhook/webhookRegistrar";
