import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmRole } from './llm.types';

interface LlmChatBody {
  message: string;
  role?: LlmRole;
  sender?: string;
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
  constructor(private readonly llmService: LlmService) {}

  /**
   * POST /api/llm/chat
   * Used by the dashboard LLM Console to test AI responses.
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: LlmChatBody) {
    const { message, role = 'admin', sender = 'dashboard-console' } = body;
    if (!message?.trim()) {
      return { reply: 'Pesan tidak boleh kosong.' };
    }
    const reply = await this.llmService.chat({
      sender,
      message: message.trim(),
      role,
      history: [],
      context: {},
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
