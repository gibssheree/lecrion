import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export interface ChatHistoryEntry {
  id: number;
  sender: string;
  name?: string | null;
  question: string;
  reply: string;
  type: string;
  cart_items?: string | null;
  total_price?: number | null;
  order_id?: number | null;
  created_at: string;
}

export interface LlmHistoryTurn {
  role: 'user' | 'model';
  content: string;
}

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a full conversation entry (question + reply pair).
   * Stored in chat_history table — persistent and queryable.
   */
  async addEntry(data: {
    sender: string;
    name?: string;
    question: string;
    reply: string;
    type?: string;
    cartItems?: string;
    totalPrice?: number;
    orderId?: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.prisma.chat_history
      .create({
        data: {
          sender: data.sender,
          name: data.name ?? null,
          question: data.question,
          reply: data.reply,
          type: data.type ?? 'chat',
          cart_items: data.cartItems ?? null,
          total_price: data.totalPrice ?? null,
          order_id: data.orderId ?? null,
          created_at: now,
        },
      })
      .catch((err) => {
        this.logger.warn(`History write failed: ${err.message}`);
      });
  }

  /**
   * Get all history entries (latest first).
   */
  async getEntries(limit = 100): Promise<ChatHistoryEntry[]> {
    return this.prisma.chat_history.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    }) as unknown as ChatHistoryEntry[];
  }

  /**
   * Get history for a specific sender in chronological order for LLM context.
   * Returns oldest-first so the LLM sees the conversation in order.
   */
  async getHistoryBySender(
    sender: string,
    limit = 10,
  ): Promise<LlmHistoryTurn[]> {
    const rows = await this.prisma.chat_history.findMany({
      where: { sender },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { question: true, reply: true },
    });

    // Reverse to get oldest-first for LLM context
    const reversed = [...rows].reverse();

    return reversed.flatMap((row) => [
      { role: 'user' as const, content: row.question },
      { role: 'model' as const, content: row.reply },
    ]);
  }

  /**
   * Get raw history rows for a sender (latest first).
   */
  async getRawHistoryBySender(
    sender: string,
    limit = 20,
  ): Promise<ChatHistoryEntry[]> {
    return this.prisma.chat_history.findMany({
      where: { sender },
      orderBy: { created_at: 'desc' },
      take: limit,
    }) as unknown as ChatHistoryEntry[];
  }

  /**
   * Clear history for a specific sender, or all history if no sender given.
   */
  async clearHistory(sender?: string): Promise<void> {
    if (sender) {
      await this.prisma.chat_history.deleteMany({ where: { sender } });
    } else {
      await this.prisma.chat_history.deleteMany({});
    }
  }

  /**
   * Count unique senders in the last N days (for bot conversation count projection).
   */
  async getConversationCounts(
    days = 7,
  ): Promise<
    Array<{ date: string; uniqueSenders: number; messageCount: number }>
  > {
    // SQLite raw query for date grouping
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ date: string; unique_senders: number; message_count: number }>
    >(
      `SELECT DATE(created_at) AS date,
              COUNT(DISTINCT sender) AS unique_senders,
              COUNT(*) AS message_count
       FROM chat_history
       WHERE DATE(created_at) >= ?
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      cutoff,
    );
    return rows.map((r) => ({
      date: r.date,
      uniqueSenders: Number(r.unique_senders),
      messageCount: Number(r.message_count),
    }));
  }
}
