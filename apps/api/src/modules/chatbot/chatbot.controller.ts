import { Controller, Get, Delete, Query, Param } from '@nestjs/common';
import { HistoryService } from './history.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * GET /api/chatbot/history?limit=50
   * Returns all chat history entries for the dashboard Chat page.
   */
  @Get('history')
  async getHistory(@Query('limit') limit?: string) {
    const history = await this.historyService.getEntries(
      limit ? parseInt(limit, 10) : 50,
    );
    return { history };
  }

  /**
   * DELETE /api/chatbot/history/:sender
   * Clears chat history for a specific sender.
   */
  @Delete('history/:sender')
  async clearHistory(@Param('sender') sender: string) {
    await this.historyService.clearHistory(decodeURIComponent(sender));
    return { ok: true, sender };
  }
}
