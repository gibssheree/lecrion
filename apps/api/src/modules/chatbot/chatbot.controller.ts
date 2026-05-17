import {
  Controller,
  Get,
  Delete,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { CartService } from './cart.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly cartService: CartService,
  ) {}

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

  /**
   * POST /api/chatbot/carts/purge-expired
   *
   * Purge all bot carts older than 24 hours.
   * Prevents stale cart data from accumulating in the database.
   * Restricted to owner/manager — not a public endpoint.
   */
  @Post('carts/purge-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async purgeExpiredCarts() {
    const deleted = await this.cartService.purgeExpiredCarts();
    return { ok: true, deleted };
  }
}
