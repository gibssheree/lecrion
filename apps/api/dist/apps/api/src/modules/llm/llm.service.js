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
var LlmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const llm_adapter_service_1 = require("./llm-adapter.service");
const prompt_templates_service_1 = require("./prompt-templates.service");
const llm_tools_service_1 = require("./llm-tools.service");
const audit_service_1 = require("../audit/audit.service");
const MAX_TOOL_ROUNDS = 3;
const MAX_REPLY_LEN = 1500;
const BLOCKED_PATTERNS = [
    /\bDROP\s+TABLE\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bUPDATE\s+.*\s+SET\b/i,
    /\bINSERT\s+INTO\b/i,
    /exec\s*\(/i,
    /require\s*\(/i,
];
const TOOL_CALL_RE = /\[TOOL:(\w+)\s*({[^}]*})\]/g;
let LlmService = LlmService_1 = class LlmService {
    constructor(adapter, promptTemplates, tools, audit) {
        this.adapter = adapter;
        this.promptTemplates = promptTemplates;
        this.tools = tools;
        this.audit = audit;
        this.logger = new common_1.Logger(LlmService_1.name);
    }
    async chat(opts) {
        const { sender, message, role = 'customer', history = [], context = {}, correlationId, } = opts;
        const start = Date.now();
        try {
            const systemPrompt = this.promptTemplates.buildSystemPrompt(role, context);
            const enrichedContext = {
                ...context,
                systemPrompt,
                roleContext: `ROLE: ${role.toUpperCase()}`,
            };
            let reply = await this.adapter.createSafeReply(message, history, enrichedContext);
            let round = 0;
            while (round < MAX_TOOL_ROUNDS) {
                const toolCalls = this.parseToolCalls(reply);
                if (!toolCalls.length)
                    break;
                let toolResultsText = '';
                for (const tc of toolCalls) {
                    const { ok, result, error } = await this.tools.executeTool(tc.name, tc.args);
                    toolResultsText += ok
                        ? `\nHASIL TOOL ${tc.name}: ${JSON.stringify(result)}`
                        : `\nERROR TOOL ${tc.name}: ${error}`;
                }
                const followUpMessage = `${message}\n\n${toolResultsText}\n\nBerikan jawaban final berdasarkan data di atas.`;
                reply = await this.adapter.createSafeReply(followUpMessage, history, enrichedContext);
                round++;
            }
            const finalReply = this.applyGuardrails(reply);
            const durationMs = Date.now() - start;
            this.logger.log(`LLM reply generated [role=${role}] [${durationMs}ms] [len=${finalReply.length}]`);
            this.audit.record({
                actor: sender,
                action: 'llm.response.generated',
                resource: 'llm',
                after: {
                    role,
                    promptLen: message.length,
                    replyLen: finalReply.length,
                    durationMs,
                },
                correlationId,
                channel: 'bot',
            });
            return finalReply;
        }
        catch (err) {
            this.logger.error(`LLM chat error: ${err.message}`, { sender, role });
            return [
                'Maaf, layanan AI sedang gangguan sementara.',
                'Kamu tetap bisa gunakan perintah berikut:',
                '- produk / stok / harga <nama barang>',
                '- status pesanan <id>',
                '- penjualan hari ini',
            ].join('\n');
        }
    }
    parseToolCalls(text) {
        const calls = [];
        TOOL_CALL_RE.lastIndex = 0;
        let match;
        while ((match = TOOL_CALL_RE.exec(text)) !== null) {
            try {
                calls.push({ name: match[1], args: JSON.parse(match[2]) });
            }
            catch {
            }
        }
        return calls;
    }
    applyGuardrails(text) {
        for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(text)) {
                this.logger.warn(`LLM reply blocked by guardrail: ${pattern.source}`);
                return 'Maaf, saya tidak bisa memproses permintaan ini. Hubungi admin jika perlu bantuan.';
            }
        }
        return text.length > MAX_REPLY_LEN
            ? text.slice(0, MAX_REPLY_LEN) + '…'
            : text;
    }
    buildStoreContext(opts) {
        const { catalogContext, cartContext, waIdentity } = opts;
        return `Konteks Toko:
User saat ini: ${waIdentity?.role || 'Customer'} (${waIdentity?.waNumber || 'Unknown'})

Daftar Menu Tersedia:
${catalogContext || 'Menu tidak ditemukan atau sedang kosong.'}

Keranjang:
${cartContext || 'Kosong.'}`;
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = LlmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_adapter_service_1.LlmAdapterService,
        prompt_templates_service_1.PromptTemplatesService,
        llm_tools_service_1.LlmToolsService,
        audit_service_1.AuditService])
], LlmService);
//# sourceMappingURL=llm.service.js.map