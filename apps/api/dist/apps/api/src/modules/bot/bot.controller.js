"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BotController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const bot_dispatch_service_1 = require("./bot-dispatch.service");
const history_service_1 = require("../chatbot/history.service");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
const prisma_1 = require("../../../../../libs/db/src/prisma");
const groupGuard_1 = require("../../../../bot/src/webhook/groupGuard");
const fonnteTransport_1 = require("../../../../bot/src/webhook/fonnteTransport");
const webhookDedupe_1 = require("../../../../bot/src/dedupe/webhookDedupe");
let BotController = BotController_1 = class BotController {
    constructor(dispatch, historyService, config, prisma) {
        this.dispatch = dispatch;
        this.historyService = historyService;
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(BotController_1.name);
        (0, webhookDedupe_1.setPrisma)(prisma);
    }
    async handleWebhook(req, res) {
        this.logger.debug('Incoming Fonnte webhook', { body: req.body });
        const webhookSecret = this.config.fonnteWebhookSecret;
        if (webhookSecret) {
            const provided = req.headers['x-webhook-secret'] ?? req.query?.secret;
            if (provided !== webhookSecret) {
                this.logger.warn('Unauthorized webhook attempt', { ip: req.ip });
                res.status(401).json({ status: 'unauthorized' });
                return;
            }
        }
        const body = req.body ?? {};
        const { sender, message, name, pushname, contact_name: contactName, url, timestamp, isgroup, } = body;
        const userMessage = String(message ?? '').trim();
        if (!sender || !userMessage) {
            res.json({ status: 'ignored' });
            return;
        }
        const groupConfig = {
            groupReplyOnlyWhenTagged: this.config.groupReplyOnlyWhenTagged,
            groupAllowPrefixCommand: this.config.groupAllowPrefixCommand,
            groupAllowReplyFollowUp: this.config.groupAllowReplyFollowUp,
            groupCommandPrefix: this.config.groupCommandPrefix,
            groupTagAliases: this.config.groupTagAliases,
            groupTagKeywords: this.config.groupTagKeywords,
        };
        if (!(0, groupGuard_1.shouldProcessGroupMessage)(body, userMessage, groupConfig)) {
            res.json({ status: 'ignored_group_not_tagged' });
            return;
        }
        const dedupKey = `${sender}-${timestamp ?? userMessage}`;
        if (await (0, webhookDedupe_1.isDuplicate)(dedupKey)) {
            this.logger.debug('Duplicate message ignored', { dedupKey });
            res.json({ status: 'ignored_duplicate' });
            return;
        }
        res.json({ status: 'ok' });
        const resolvedName = name ?? pushname ?? contactName ?? null;
        const userWaIdentity = (0, groupGuard_1.getUserWaIdentity)(body);
        const conversationSender = isgroup
            ? `${sender}:${(0, groupGuard_1.extractDigits)(body.member ?? body.memberlid ?? resolvedName ?? 'unknown')}`
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
    async processAsync(ctx) {
        const { sender, conversationSender, resolvedName, userMessage } = ctx;
        const fonnteToken = this.config.fonnteToken;
        try {
            const result = await this.dispatch.dispatch(ctx);
            if (!result?.reply)
                throw new Error('Empty reply generated');
            await (0, fonnteTransport_1.sendFonnteMessage)(sender, result.reply, fonnteToken);
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
        }
        catch (err) {
            this.logger.error(`Bot processing error: ${err.message}`, { sender });
            try {
                await (0, fonnteTransport_1.sendFonnteMessage)(sender, 'Maaf, terjadi kendala saat memproses pesan. Silakan ulangi beberapa saat lagi.', fonnteToken);
            }
            catch (sendErr) {
                this.logger.warn(`Failed to send error notification: ${sendErr.message}`);
            }
        }
    }
};
exports.BotController = BotController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BotController.prototype, "handleWebhook", null);
exports.BotController = BotController = BotController_1 = __decorate([
    (0, common_1.Controller)('bot'),
    __metadata("design:paramtypes", [bot_dispatch_service_1.BotDispatchService,
        history_service_1.HistoryService,
        app_config_service_1.AppConfigService,
        prisma_1.PrismaService])
], BotController);
//# sourceMappingURL=bot.controller.js.map