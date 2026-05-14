import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { BotDispatchService } from './bot-dispatch.service';
import { HistoryService } from '../chatbot/history.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { PrismaService } from '@libs/db/src/prisma';
import {
  shouldProcessGroupMessage,
  getUserWaIdentity,
  extractDigits,
  GroupConfig,
} from '@bot/webhook/groupGuard';
import { sendFonnteMessage } from '@bot/webhook/fonnteTransport';
import { isDuplicate, setPrisma } from '@bot/dedupe/webhookDedupe';

/**
 * BotController — NestJS HTTP controller for the Fonnte WhatsApp webhook.
 *
 * Per 03-file-architecture.md: apps/bot owns webhook transport.
 * Per 01-blueprint.md: bot is a client of the POS core — all business logic
 * goes through NestJS services, not direct DB access.
 *
 * Route: POST /api/bot/webhook
 * Marked @Public() — Fonnte calls this without auth headers.
 */
@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(
    private readonly dispatch: BotDispatchService,
    private readonly historyService: HistoryService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Inject Prisma into the dedupe module (singleton pattern)
    setPrisma(prisma);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug('Incoming Fonnte webhook', { body: req.body });

    // 1. Optional webhook secret verification
    const webhookSecret = this.config.fonnteWebhookSecret;
    if (webhookSecret) {
      const provided =
        req.headers['x-webhook-secret'] ?? (req.query as any)?.secret;
      if (provided !== webhookSecret) {
        this.logger.warn('Unauthorized webhook attempt', { ip: req.ip });
        res.status(401).json({ status: 'unauthorized' });
        return;
      }
    }

    const body = req.body ?? {};
    const {
      sender,
      message,
      name,
      pushname,
      contact_name: contactName,
      url,
      timestamp,
      isgroup,
    } = body;
    const userMessage = String(message ?? '').trim();

    if (!sender || !userMessage) {
      res.json({ status: 'ignored' });
      return;
    }

    // 2. Group guard
    const groupConfig: GroupConfig = {
      groupReplyOnlyWhenTagged: this.config.groupReplyOnlyWhenTagged,
      groupAllowPrefixCommand: this.config.groupAllowPrefixCommand,
      groupAllowReplyFollowUp: this.config.groupAllowReplyFollowUp,
      groupCommandPrefix: this.config.groupCommandPrefix,
      groupTagAliases: this.config.groupTagAliases,
      groupTagKeywords: this.config.groupTagKeywords,
    };

    if (!shouldProcessGroupMessage(body, userMessage, groupConfig)) {
      res.json({ status: 'ignored_group_not_tagged' });
      return;
    }

    // 3. DB-backed deduplication
    const dedupKey = `${sender}-${timestamp ?? userMessage}`;
    if (await isDuplicate(dedupKey)) {
      this.logger.debug('Duplicate message ignored', { dedupKey });
      res.json({ status: 'ignored_duplicate' });
      return;
    }

    // 4. Respond immediately — Fonnte expects fast response
    res.json({ status: 'ok' });

    // 5. Async processing (fire-and-forget)
    const resolvedName = name ?? pushname ?? contactName ?? null;
    const userWaIdentity = getUserWaIdentity(body);
    const conversationSender = isgroup
      ? `${sender}:${extractDigits(body.member ?? body.memberlid ?? resolvedName ?? 'unknown')}`
      : sender;

    this.processAsync({
      userMessage,
      sender,
      conversationSender,
      resolvedName,
      userWaIdentity,
      imageUrl: url ?? null,
      isgroup: Boolean(isgroup),
    }).catch((err) => {
      this.logger.error(`Async processing failed: ${err.message}`, { sender });
    });
  }

  private async processAsync(ctx: {
    userMessage: string;
    sender: string;
    conversationSender: string;
    resolvedName: string | null;
    userWaIdentity: string;
    imageUrl: string | null;
    isgroup: boolean;
  }): Promise<void> {
    const { sender, conversationSender, resolvedName, userMessage } = ctx;
    const fonnteToken = this.config.fonnteToken;

    try {
      const result = await this.dispatch.dispatch(ctx);

      if (!result?.reply) throw new Error('Empty reply generated');

      await sendFonnteMessage(sender, result.reply, fonnteToken);

      await this.historyService.addEntry({
        sender: conversationSender,
        name: resolvedName ?? undefined,
        question: userMessage,
        reply: result.reply,
        type: result.entryType ?? 'chat',
        orderId: result.orderId,
        totalPrice: result.totalPrice,
        cartItems: result.cartItems
          ? JSON.stringify(result.cartItems)
          : undefined,
      });
    } catch (err: any) {
      this.logger.error(`Bot processing error: ${err.message}`, { sender });
      try {
        await sendFonnteMessage(
          sender,
          'Maaf, terjadi kendala saat memproses pesan. Silakan ulangi beberapa saat lagi.',
          fonnteToken,
        );
      } catch (sendErr: any) {
        this.logger.warn(
          `Failed to send error notification: ${sendErr.message}`,
        );
      }
    }
  }
}
