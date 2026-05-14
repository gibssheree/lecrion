import { Injectable, Logger } from '@nestjs/common';
import { LlmAdapterService } from './llm-adapter.service';
import { PromptTemplatesService } from './prompt-templates.service';
import { LlmToolsService } from './llm-tools.service';
import { AuditService } from '../audit/audit.service';
import { LlmChatOptions, LlmHistoryTurn } from './llm.types';

const MAX_TOOL_ROUNDS = 3;
const MAX_REPLY_LEN = 1500;

// Patterns that indicate a blocked/dangerous reply
const BLOCKED_PATTERNS = [
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bUPDATE\s+.*\s+SET\b/i,
  /\bINSERT\s+INTO\b/i,
  /exec\s*\(/i,
  /require\s*\(/i,
];

// Regex to parse [TOOL:name {args}] markers in LLM replies
const TOOL_CALL_RE = /\[TOOL:(\w+)\s*({[^}]*})\]/g;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly adapter: LlmAdapterService,
    private readonly promptTemplates: PromptTemplatesService,
    private readonly tools: LlmToolsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Process a chat message through the LLM with tool-call support.
   * Applies role-based system prompt, tool-call loop, and output guardrails.
   */
  async chat(opts: LlmChatOptions): Promise<string> {
    const {
      sender,
      message,
      role = 'customer',
      history = [],
      context = {},
      correlationId,
    } = opts;

    const start = Date.now();

    try {
      const systemPrompt = this.promptTemplates.buildSystemPrompt(
        role,
        context,
      );
      const enrichedContext = {
        ...context,
        systemPrompt,
        roleContext: `ROLE: ${role.toUpperCase()}`,
      };

      let reply = await this.adapter.createSafeReply(
        message,
        history,
        enrichedContext,
      );
      let round = 0;

      // Tool call loop — execute any [TOOL:name {args}] markers in the reply
      while (round < MAX_TOOL_ROUNDS) {
        const toolCalls = this.parseToolCalls(reply);
        if (!toolCalls.length) break;

        let toolResultsText = '';
        for (const tc of toolCalls) {
          const { ok, result, error } = await this.tools.executeTool(
            tc.name,
            tc.args,
          );
          toolResultsText += ok
            ? `\nHASIL TOOL ${tc.name}: ${JSON.stringify(result)}`
            : `\nERROR TOOL ${tc.name}: ${error}`;
        }

        // Feed tool results back into LLM for final reply
        const followUpMessage = `${message}\n\n${toolResultsText}\n\nBerikan jawaban final berdasarkan data di atas.`;
        reply = await this.adapter.createSafeReply(
          followUpMessage,
          history,
          enrichedContext,
        );
        round++;
      }

      const finalReply = this.applyGuardrails(reply);
      const durationMs = Date.now() - start;

      this.logger.log(
        `LLM reply generated [role=${role}] [${durationMs}ms] [len=${finalReply.length}]`,
      );

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
    } catch (err: any) {
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

  private parseToolCalls(
    text: string,
  ): Array<{ name: string; args: Record<string, any> }> {
    const calls: Array<{ name: string; args: Record<string, any> }> = [];
    TOOL_CALL_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOOL_CALL_RE.exec(text)) !== null) {
      try {
        calls.push({ name: match[1], args: JSON.parse(match[2]) });
      } catch {
        // ignore malformed tool calls
      }
    }
    return calls;
  }

  private applyGuardrails(text: string): string {
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

  /**
   * Build AI context for a store interaction (catalog + cart summary).
   */
  buildStoreContext(opts: {
    catalogContext?: string;
    cartContext?: string;
    waIdentity?: { role?: string; waNumber?: string };
  }): string {
    const { catalogContext, cartContext, waIdentity } = opts;
    return `Konteks Toko:
User saat ini: ${waIdentity?.role || 'Customer'} (${waIdentity?.waNumber || 'Unknown'})

Daftar Menu Tersedia:
${catalogContext || 'Menu tidak ditemukan atau sedang kosong.'}

Keranjang:
${cartContext || 'Kosong.'}`;
  }
}
