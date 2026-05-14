import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { menu as Menu } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  toDisplayRupiah(basePrice: number | null): number {
    return Number(basePrice) || 0;
  }

  formatRupiah(basePrice: number | null): string {
    return new Intl.NumberFormat('id-ID').format(Number(basePrice) || 0);
  }

  inferCategory(name = '', imageUrl: string | null = ''): string {
    const text = `${name} ${imageUrl || ''}`.toLowerCase();
    if (text.includes('drink') || text.includes('minum') || text.includes('juice') || text.includes('es ')) return 'Minuman';
    if (text.includes('snack') || text.includes('pisang') || text.includes('roti') || text.includes('kentang') || text.includes('pie') || text.includes('ubi')) return 'Snack';
    return 'Makanan';
  }

  normalizeProduct(row: Menu) {
    const basePrice = Number(row.price);
    return {
      id: Number(row.id),
      name: row.name,
      price: basePrice,
      displayPrice: this.toDisplayRupiah(basePrice),
      stock: Number(row.stock),
      description: row.description || '',
      imageUrl: row.image_url || null,
      category: this.inferCategory(row.name, row.image_url),
      available: Number(row.stock) > 0,
    };
  }

  async getAllProducts() {
    const rows = await this.prisma.menu.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(r => this.normalizeProduct(r));
  }

  async getProductById(id: number) {
    const row = await this.prisma.menu.findUnique({
      where: { id },
    });
    return row ? this.normalizeProduct(row) : null;
  }

  async findProductByName(keyword: string) {
    if (!keyword?.trim()) return null;
    const rows = await this.prisma.menu.findMany({
      where: {
        name: { contains: keyword.trim() }
      },
      orderBy: [
        { stock: 'desc' },
        { id: 'asc' }
      ],
      take: 1,
    });
    return rows.length ? this.normalizeProduct(rows[0]) : null;
  }

  async searchProducts(keyword: string, limit = 8) {
    const normalizedKeyword = (keyword || '').trim();
    const rows = await this.prisma.menu.findMany({
      where: {
        OR: [
          { name: { contains: normalizedKeyword } },
          { description: { contains: normalizedKeyword } },
        ]
      },
      orderBy: [
        { stock: 'desc' },
        { name: 'asc' }
      ],
      take: Number(limit) || 8,
    });
    return rows.map(r => this.normalizeProduct(r));
  }

  async getCatalogContext(limit = 25): Promise<string> {
    const rows = await this.prisma.menu.findMany({
      orderBy: [
        { stock: 'desc' },
        { name: 'asc' }
      ],
      take: Number(limit) || 25,
    });
    if (!rows.length) return 'Belum ada produk tersedia.';
    return rows.map((row) => {
      const stockText = Number(row.stock) > 0 ? `stok ${row.stock}` : 'stok habis';
      return `#${row.id} ${row.name} - Rp${this.formatRupiah(Number(row.price))} (${stockText})`;
    }).join('\n');
  }

  async getCatalogForStore() {
    return this.getAllProducts();
  }

  async updateStock(id: number, stock: number) {
    return this.prisma.menu.update({
      where: { id },
      data: { stock },
    });
  }
}
