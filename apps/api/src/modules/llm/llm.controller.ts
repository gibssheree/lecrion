import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmRole } from './llm.types';
import { AiUsageService } from './ai-usage.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

interface LlmChatBody {
  message: string;
}

/**
 * Map the authenticated user's role to an LLM persona/access level.
 * Role is derived from the JWT — never trusted from the request body —
 * so a logged-in cashier cannot request an admin-level prompt.
 */
function mapUserRoleToLlmRole(role?: string): LlmRole {
  switch (role) {
    case 'owner':
    case 'manager':
    case 'dashboard': // dashboard service identity behaves as manager
      return 'admin';
    case 'cashier':
      return 'cashier';
    case 'support':
      return 'support';
    case 'inventory_staff':
      return 'cashier'; // may check stock, not financial data
    default:
      return 'customer'; // least privilege for unknown/service roles
  }
}

// Tool definitions for the dashboard Tool Inspector
const TOOL_DEFINITIONS = [
  {
    name: 'check_product_stock',
    description:
      'Check current stock and price of a product by name or partial name.',
    readOnly: true,
    parameters: {
      name: {
        type: 'string',
        description: 'Product name or partial name to search',
        required: true,
      },
    },
  },
  {
    name: 'get_order_status',
    description: 'Get the current status of an order by order ID.',
    readOnly: true,
    parameters: {
      orderId: {
        type: 'number',
        description: 'The order ID to look up',
        required: true,
      },
    },
  },
  {
    name: 'list_open_orders',
    description: 'List all currently open or pending orders for the store.',
    readOnly: true,
    parameters: {
      limit: {
        type: 'number',
        description: 'Maximum number of orders to return (default 10)',
        required: false,
      },
    },
  },
  {
    name: 'get_daily_sales_summary',
    description:
      "Get today's sales summary: total revenue, order count, top selling items.",
    readOnly: true,
    parameters: {},
  },
  {
    name: 'search_customer_history',
    description:
      'Get recent order history for a customer by their phone number.',
    readOnly: true,
    parameters: {
      phone: {
        type: 'string',
        description: 'Customer phone number (digits only)',
        required: true,
      },
    },
  },
];

@Controller('llm')
export class LlmController {
  constructor(
    private readonly llmService: LlmService,
    private readonly aiUsage: AiUsageService,
  ) {}

  /**
   * POST /api/llm/chat
   * Used by the dashboard LLM Console to test AI responses — this is the
   * "AI Owner Assistant" the pricing page sells a per-tier chat quota for.
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: LlmChatBody, @CurrentUser() user: AuthUser) {
    const message = body?.message;
    if (!message?.trim()) {
      return { reply: 'Pesan tidak boleh kosong.' };
    }

    const storeId = user?.storeId ?? 'default-store';
    const quota = await this.aiUsage.checkAndIncrement(storeId, 'owner_assistant');
    if (!quota.allowed) {
      throw new HttpException(
        {
          message: `Kuota chat AI Owner Assistant habis (${quota.dailyCount}/${quota.dailyLimit} hari ini, ${quota.monthlyCount}/${quota.monthlyLimit} bulan ini). Upgrade paket untuk kuota lebih besar.`,
        },
        429,
      );
    }

    // Role + identity come from the authenticated token, NOT the request body.
    const role = mapUserRoleToLlmRole(user?.role);
    const sender = user?.actor ?? 'dashboard-console';
    const reply = await this.llmService.chat({
      sender,
      message: message.trim(),
      role,
      history: [],
      context: {},
      storeId,
    });
    return { reply };
  }

  /**
   * GET /api/llm/tools
   * Returns tool definitions for the dashboard Tool Inspector.
   */
  @Get('tools')
  getTools() {
    return { tools: TOOL_DEFINITIONS };
  }
}
