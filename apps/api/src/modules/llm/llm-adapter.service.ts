import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { LlmHistoryTurn, LlmContext } from './llm.types';

const MAX_REPLY_LENGTH = 4000;

const BLOCKED_PATTERNS = [
  /```sql/i,
  /DROP\s+TABLE/i,
  /process\.env/i,
  /require\s*\(/i,
];

@Injectable()
export class LlmAdapterService {
  private readonly logger = new Logger(LlmAdapterService.name);

  constructor(private readonly config: AppConfigService) {}

  /**
   * Create a safe LLM reply, routing to Gemini (OpenAI-compatible) or Vertex AI.
   * Applies output guardrails before returning.
   */
  async createSafeReply(
    message: string,
    history: LlmHistoryTurn[] = [],
    context: LlmContext = {},
  ): Promise<string> {
    try {
      const raw = await this.createGeminiReply(message, history, context);
      return this.applyGuardrails(raw);
    } catch (err: any) {
      this.logger.error(`[LLM Adapter] Error: ${err.message}`);
      return 'Maaf, sistem AI sedang gangguan.';
    }
  }

  private async createGeminiReply(
    message: string,
    history: LlmHistoryTurn[],
    context: LlmContext,
  ): Promise<string> {
    const apiKey = this.config.geminiApiKey;
    const model = this.config.geminiModel;

    if (!apiKey) {
      this.logger.warn(
        '[LLM Adapter] GEMINI_API_KEY not set — returning fallback',
      );
      return 'Maaf, konfigurasi AI belum lengkap. Hubungi admin.';
    }

    const {
      systemPrompt,
      catalogContext,
      cartContext,
      posContext,
      roleContext,
    } = context;

    const sysContent =
      systemPrompt ||
      `Kamu asisten WhatsApp Toko. Role: ${roleContext || 'customer'}. POS: ${posContext || '-'}. Katalog: ${catalogContext || '-'}. Cart: ${cartContext || '-'}. Jawab ramah & ringkas.`;

    // Build messages array for OpenAI-compatible Gemini endpoint
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: sysContent },
    ];

    for (const turn of history) {
      messages.push({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.content,
      });
    }
    messages.push({ role: 'user', content: message });

    // Use fetch (available in Node 18+) to call Gemini OpenAI-compatible endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
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
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(
        `Gemini API error ${response.status}: ${errText.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return text.replace(/\*/g, '').trim();
  }

  private applyGuardrails(text: string): string {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(text)) {
        this.logger.warn(
          `[LLM Adapter] Reply blocked by guardrail: ${pattern.source}`,
        );
        return 'Maaf, respon tidak aman.';
      }
    }
    if (text.length > MAX_REPLY_LENGTH) {
      return text.slice(0, MAX_REPLY_LENGTH - 50) + '...';
    }
    return text;
  }
}
