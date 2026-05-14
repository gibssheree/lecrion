// apps/bot/src/dedupe/webhookDedupe.ts
// Webhook deduplication using Prisma (replaces better-sqlite3 direct access)

import { PrismaService } from "../../../../libs/db/src/prisma";

const TTL_HOURS = 24;
let _prisma: PrismaService | null = null;

export function setPrisma(prisma: PrismaService): void {
  _prisma = prisma;
}

export async function isDuplicate(msgId: string): Promise<boolean> {
  if (!msgId || !_prisma) return false;

  const cutoff = new Date(
    Date.now() - TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const row = await _prisma.webhook_dedupes.findFirst({
    where: {
      dedupe_key: msgId,
      created_at: { gt: cutoff },
    },
  });

  if (row) return true;

  // Record this message ID
  await _prisma.webhook_dedupes
    .upsert({
      where: { dedupe_key: msgId },
      update: { created_at: new Date().toISOString() },
      create: { dedupe_key: msgId, created_at: new Date().toISOString() },
    })
    .catch(() => {});

  // Cleanup old entries occasionally
  if (Math.random() < 0.01) {
    _prisma.webhook_dedupes
      .deleteMany({ where: { created_at: { lt: cutoff } } })
      .catch(() => {});
  }

  return false;
}
