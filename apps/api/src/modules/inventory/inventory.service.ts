import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async searchIngredientByName(keyword: string) {
    if (!keyword?.trim()) return null;
    return this.prisma.menu.findFirst({
      where: {
        name: {
          contains: keyword.trim(),
        },
      },
      orderBy: [
        { stock: 'desc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });
  }

  async getIngredientGlobalStats() {
    const aggregations = await this.prisma.menu.aggregate({
      _count: {
        id: true,
      },
      _sum: {
        stock: true,
      },
    });

    return {
      totalItems: aggregations._count.id || 0,
      totalStock: aggregations._sum.stock || 0,
    };
  }

  async getIngredientSummaryByCategory() {
    // Note: In the current SQLite schema, category might be inferred or in a column.
    // If it's not in the schema, we return an empty object for now.
    return {};
  }

  async getAllIngredientStocks(limit = 100) {
    return this.prisma.menu.findMany({
      where: { is_stock_tracked: true },
      select: {
        id:               true,
        name:             true,
        stock:            true,
        is_stock_tracked: true,
        is_active:        true,
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });
  }

  async getIngredientsByCategory(category: string, limit = 25) {
    // Currently SQLite menu doesn't have category column in the introspected schema
    // We'll return generic list for now to maintain compatibility with bot expectations
    return this.prisma.menu.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });
  }

  async getLowStockIngredients(threshold = 5) {
    // Only alert on products that are stock-tracked; service items are excluded.
    return this.prisma.menu.findMany({
      where: {
        is_stock_tracked: true,
        stock: {
          gt:  0,
          lte: threshold,
        },
      },
      select: {
        id:               true,
        name:             true,
        stock:            true,
        is_stock_tracked: true,
      },
      orderBy: {
        stock: 'asc',
      },
    });
  }

  async getOutOfStockIngredients(limit = 100) {
    // Only report stock-tracked products as out-of-stock.
    return this.prisma.menu.findMany({
      where: {
        is_stock_tracked: true,
        stock: {
          lte: 0,
        },
      },
      select: {
        id:               true,
        name:             true,
        stock:            true,
        is_stock_tracked: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });
  }

  async getPopIceAvailability() {
    return this.prisma.menu.findMany({
      where: {
        name: {
          contains: 'pop ice',
        },
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
