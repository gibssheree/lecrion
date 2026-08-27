// apps/api/src/modules/bot/bot-routing.service.ts
//
// Resolves "which store is this WhatsApp message for" (SEC-11) — the piece
// that was missing entirely before this file existed. See the
// bot_conversation_bindings model comment in schema.prisma for the design.
//
// Resolution order, checked in resolveConversation():
//   1. Owner check — is this sender's number in ANY store's `adminPhones`
//      setting? If so, this is that store's owner, regardless of any
//      customer binding. Checked first so an owner is never misidentified
//      as a random unbound customer.
//   2. Trigger message — does the incoming text exactly match
//      "LECRION:<storeId>" for a real store? If so, (re)bind this sender to
//      that store. If the binding is actually changing (not a no-op re-scan
//      of the same code), clear the sender's cart and chat history first —
//      see the schema comment for why that's the chosen tradeoff instead of
//      adding store_id to carts/cart_items/chat_history.
//   3. Existing binding — does this sender already have a binding?
//   4. Fallback — config.defaultStoreId, preserving today's behavior for
//      any sender who's never gone through the QR/trigger flow. This is
//      what keeps the one real store using the bot today working exactly
//      as before; nothing about this fallback changes.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { StoresService } from '../stores/stores.service';
import { CartService } from '../chatbot/cart.service';
import { HistoryService } from '../chatbot/history.service';

const TRIGGER_PATTERN = /^LECRION:(.+)$/i;

export interface ResolvedConversation {
  storeId: string;
  storeName: string;
  isOwner: boolean;
  justBound: boolean;
}

@Injectable()
export class BotRoutingService {
  private readonly logger = new Logger(BotRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly stores: StoresService,
    private readonly cart: CartService,
    private readonly history: HistoryService,
  ) {}

  async resolveConversation(
    sender: string,
    incomingMessage: string,
  ): Promise<ResolvedConversation> {
    const ownerStoreId = await this.findStoreIdByAdminPhone(sender);
    if (ownerStoreId) {
      return {
        storeId: ownerStoreId,
        storeName: await this.getStoreDisplayName(ownerStoreId),
        isOwner: true,
        justBound: false,
      };
    }

    const triggerMatch = incomingMessage.trim().match(TRIGGER_PATTERN);
    if (triggerMatch) {
      const candidateStoreId = triggerMatch[1].trim();
      const exists = await this.storeExists(candidateStoreId);
      if (exists) {
        const previousBinding = await this.getBinding(sender);
        if (previousBinding !== candidateStoreId) {
          await this.bindSender(sender, candidateStoreId);
          if (previousBinding) {
            // Switching stores — clear so nothing from the old store's
            // conversation leaks into the new one (see schema comment).
            await Promise.all([
              this.cart.clearCart(sender).catch(() => {}),
              this.history.clearHistory(sender).catch(() => {}),
            ]);
            this.logger.log(
              `Rebound sender=${sender} from store=${previousBinding} to store=${candidateStoreId}; cart/history cleared`,
            );
          } else {
            this.logger.log(
              `Bound sender=${sender} to store=${candidateStoreId}`,
            );
          }
        }
        return {
          storeId: candidateStoreId,
          storeName: await this.getStoreDisplayName(candidateStoreId),
          isOwner: false,
          justBound: true,
        };
      }
      this.logger.warn(
        `Trigger message referenced unknown store="${candidateStoreId}" from sender=${sender}`,
      );
      // Falls through to existing-binding / default below — an invalid
      // code shouldn't strand the sender with no store at all.
    }

    const existingBinding = await this.getBinding(sender);
    if (existingBinding) {
      return {
        storeId: existingBinding,
        storeName: await this.getStoreDisplayName(existingBinding),
        isOwner: false,
        justBound: false,
      };
    }

    const fallbackStoreId = this.config.defaultStoreId;
    return {
      storeId: fallbackStoreId,
      storeName: await this.getStoreDisplayName(fallbackStoreId),
      isOwner: false,
      justBound: false,
    };
  }

  /**
   * The wa.me deep link for a store's customer-facing QR code / bio link.
   * Returns null if FONNTE_WA_NUMBER isn't configured — callers should tell
   * the operator to set it rather than hand out a broken link.
   */
  buildWhatsAppLink(storeId: string): string | null {
    const number = this.config.fonnteWaNumber.replace(/\D/g, '');
    if (!number) return null;
    const text = encodeURIComponent(`LECRION:${storeId}`);
    return `https://wa.me/${number}?text=${text}`;
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  private async findStoreIdByAdminPhone(sender: string): Promise<string | null> {
    const target = this.normalizePhone(sender);
    if (!target) return null;

    const rows = await this.prisma.$queryRawUnsafe<
      { key: string; value: string }[]
    >(`SELECT key, value FROM store_settings WHERE key LIKE '%:adminPhones'`);

    for (const row of rows) {
      const storeId = row.key.slice(0, -':adminPhones'.length);
      const allow = (row.value ?? '')
        .split(/[\s,;]+/)
        .map((entry) => this.normalizePhone(entry))
        .filter(Boolean);
      if (allow.includes(target)) return storeId;
    }
    return null;
  }

  private async storeExists(storeId: string): Promise<boolean> {
    const row = await (this.prisma as any).stores.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    return Boolean(row);
  }

  private async getBinding(sender: string): Promise<string | null> {
    const row = await (this.prisma as any).bot_conversation_bindings.findUnique(
      { where: { sender } },
    );
    return row?.store_id ?? null;
  }

  private async bindSender(sender: string, storeId: string): Promise<void> {
    const now = new Date().toISOString();
    await (this.prisma as any).bot_conversation_bindings.upsert({
      where: { sender },
      update: { store_id: storeId, updated_at: now },
      create: { sender, store_id: storeId, bound_at: now, updated_at: now },
    });
  }

  private async getStoreDisplayName(storeId: string): Promise<string> {
    const settings = await this.stores.getSettings(storeId);
    return settings['storeName'] || storeId;
  }

  /** Canonicalize an Indonesian phone number to "62…" digits for comparison. */
  private normalizePhone(phone: string): string {
    let d = String(phone ?? '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) d = '62' + d.slice(1);
    else if (d.startsWith('8')) d = '62' + d;
    return d;
  }
}
