// apps/bot/src/bot.module.ts
//
// This file is intentionally minimal.
//
// apps/bot is a utility bundle — not a standalone NestJS application.
// The active NestJS bot module lives at:
//   apps/api/src/modules/bot/bot.module.ts
//
// If a future requirement calls for a separate bot process, this module
// would be the entry point for that NestJS app. Until then, it is a
// documented placeholder.

import { Module } from "@nestjs/common";

@Module({
  imports: [],
  providers: [],
  exports: [],
})
export class BotAppModule {}
