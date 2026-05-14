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
var LlmAdapterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmAdapterService = void 0;
const common_1 = require("@nestjs/common");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
const MAX_REPLY_LENGTH = 4000;
const BLOCKED_PATTERNS = [
    /```sql/i,
    /DROP\s+TABLE/i,
    /process\.env/i,
    /require\s*\(/i,
];
let LlmAdapterService = LlmAdapterService_1 = class LlmAdapterService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LlmAdapterService_1.name);
    }
    async createSafeReply(message, history = [], context = {}) {
        try {
            const raw = await this.createGeminiReply(message, history, context);
            return this.applyGuardrails(raw);
        }
        catch (err) {
            this.logger.error(`[LLM Adapter] Error: ${err.message}`);
            return 'Maaf, sistem AI sedang gangguan.';
        }
    }
    async createGeminiReply(message, history, context) {
        const apiKey = this.config.geminiApiKey;
        const model = this.config.geminiModel;
        if (!apiKey) {
            this.logger.warn('[LLM Adapter] GEMINI_API_KEY not set — returning fallback');
            return 'Maaf, konfigurasi AI belum lengkap. Hubungi admin.';
        }
        const { systemPrompt, catalogContext, cartContext, posContext, roleContext, } = context;
        const sysContent = systemPrompt ||
            `Kamu asisten WhatsApp Toko. Role: ${roleContext || 'customer'}. POS: ${posContext || '-'}. Katalog: ${catalogContext || '-'}. Cart: ${cartContext || '-'}. Jawab ramah & ringkas.`;
        const messages = [
            { role: 'system', content: sysContent },
        ];
        for (const turn of history) {
            messages.push({
                role: turn.role === 'model' ? 'assistant' : 'user',
                content: turn.content,
            });
        }
        messages.push({ role: 'user', content: message });
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
            }),
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
        }
        const data = (await response.json());
        const text = data?.choices?.[0]?.message?.content ?? '';
        return text.replace(/\*/g, '').trim();
    }
    applyGuardrails(text) {
        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(text)) {
                this.logger.warn(`[LLM Adapter] Reply blocked by guardrail: ${pattern.source}`);
                return 'Maaf, respon tidak aman.';
            }
        }
        if (text.length > MAX_REPLY_LENGTH) {
            return text.slice(0, MAX_REPLY_LENGTH - 50) + '...';
        }
        return text;
    }
};
exports.LlmAdapterService = LlmAdapterService;
exports.LlmAdapterService = LlmAdapterService = LlmAdapterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_service_1.AppConfigService])
], LlmAdapterService);
//# sourceMappingURL=llm-adapter.service.js.map