import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { ToolCallResult } from './llm.types';

@Injectable()
export class LlmToolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a named tool call from the LLM.
   * All tools are read-only — LLM cannot write to the database.
   */
  async executeTool(
    toolName: string,
    args: Record<string, any> = {},
  ): Promise<ToolCallResult> {
    try {
      switch (toolName) {
        case 'check_product_stock':
          return await this.checkProductStock(args.name);
        case 'get_order_status':
          return await this.getOrderStatus(args.orderId);
        case 'list_open_orders':
          return await this.listOpenOrders(args.limit);
        case 'get_daily_sales_summary':
          return await this.getDailySalesSummary();
        case 'search_customer_history':
          return await this.searchCustomerHistory(args.phone);
        default:
          return { ok: false, error: `Tool "${toolName}" tidak dikenal` };
      }
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  private async checkProductStock(name: string): Promise<ToolCallResult> {
    if (!name) return { ok: false, error: 'Parameter name diperlukan' };
    const rows = await this.prisma.menu.findMany({
      where: { name: { contains: name } },
      take: 5,
      select: { id: true, name: true, price: true, stock: true },
    });
    if (!rows.length) {
      return {
        ok: true,
        result: {
          found: false,
          message: `Tidak ada produk dengan nama "${name}"`,
        },
      };
    }
    return {
      ok: true,
      result: {
        found: true,
        products: rows.map((r) => ({
          id: r.id,
          name: r.name,
          price: Number(r.price),
          stock: r.stock,
        })),
      },
    };
  }

  private async getOrderStatus(orderId: number): Promise<ToolCallResult> {
    const id = Number(orderId);
    if (!id) return { ok: false, error: 'Parameter orderId diperlukan' };

    const order = await this.prisma.orders.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        payment_method: true,
        created_at: true,
      },
    });
    if (!order) {
      return {
        ok: true,
        result: { found: false, message: `Order #${id} tidak ditemukan` },
      };
    }

    const items = await this.prisma.order_items.findMany({
      where: { order_id: id },
      select: { name: true, price: true, qty: true },
    });
    const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);

    return {
      ok: true,
      result: { found: true, order: { ...order, items, total } },
    };
  }

  private async listOpenOrders(limit = 10): Promise<ToolCallResult> {
    const safeLimit = Math.min(Number(limit) || 10, 50);
    const orders = await this.prisma.orders.findMany({
      where: {
        status: { notIn: ['cancelled', 'completed', 'refunded'] },
      },
      orderBy: { created_at: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        created_at: true,
      },
    });
    return { ok: true, result: { orders, count: orders.length } };
  }

  private async getDailySalesSummary(): Promise<ToolCallResult> {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ order_count: number; revenue: number }>
    >(
      `SELECT COUNT(DISTINCT o.id) AS order_count, COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')`,
      today,
    );

    const topItems = await this.prisma.$queryRawUnsafe<
      Array<{ name: string; units: number; revenue: number }>
    >(
      `SELECT oi.name, SUM(oi.qty) AS units, SUM(oi.price * oi.qty) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE DATE(o.created_at) = ? AND o.status NOT IN ('cancelled', 'refunded')
       GROUP BY oi.name ORDER BY revenue DESC LIMIT 5`,
      today,
    );

    const summary = rows[0] ?? { order_count: 0, revenue: 0 };
    return {
      ok: true,
      result: {
        date: today,
        orderCount: Number(summary.order_count),
        revenue: Number(summary.revenue),
        topItems: topItems.map((i) => ({
          name: i.name,
          units: Number(i.units),
          revenue: Number(i.revenue),
        })),
      },
    };
  }

  private async searchCustomerHistory(phone: string): Promise<ToolCallResult> {
    if (!phone) return { ok: false, error: 'Parameter phone diperlukan' };
    const digits = String(phone).replace(/\D/g, '');

    const orders = await this.prisma.$queryRawUnsafe<
      Array<{
        id: number;
        type: string;
        status: string;
        created_at: string;
        total: number;
      }>
    >(
      `SELECT o.id, o.type, o.status, o.created_at, SUM(oi.price * oi.qty) AS total
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.phone = ? OR o.name = ?
       GROUP BY o.id ORDER BY o.created_at DESC LIMIT 5`,
      digits,
      digits,
    );

    return {
      ok: true,
      result: {
        phone: digits,
        orders: orders.map((o) => ({ ...o, total: Number(o.total) })),
        count: orders.length,
      },
    };
  }
}
