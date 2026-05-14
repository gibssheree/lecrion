import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

@Injectable()
export class IdempotencyService {
  private readonly TTL_SECONDS = 60 * 60 * 24; // 24 hours
  private _lastCleanup = 0;

  constructor(private readonly prisma: PrismaService) {}

  private async maybeCleanup() {
    const now = Date.now();
    if (now - this._lastCleanup > 60_000) {
      await this.prisma.idempotency_keys.deleteMany({
        where: {
          expires_at: {
            lte: new Date().toISOString(),
          },
        },
      });
      this._lastCleanup = now;
    }
  }

  async check(key: string): Promise<any | null> {
    if (!key) return null;
    await this.maybeCleanup();

    const row = await this.prisma.idempotency_keys.findFirst({
      where: {
        key,
        expires_at: {
          gt: new Date().toISOString(),
        },
      },
    });

    if (!row) return null;
    try {
      return JSON.parse(row.result);
    } catch {
      return null;
    }
  }

  async save(key: string, result: any): Promise<void> {
    if (!key) return;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.TTL_SECONDS);

    await this.prisma.idempotency_keys.upsert({
      where: { key },
      update: {
        result: JSON.stringify(result),
        expires_at: expiresAt.toISOString(),
      },
      create: {
        key,
        result: JSON.stringify(result),
        expires_at: expiresAt.toISOString(),
      },
    });
  }

  buildCheckoutKey(sender: string, cartItemIds: number[]): string {
    const sorted = [...cartItemIds].sort().join(',');
    return `checkout:${sender}:${sorted}`;
  }
}
