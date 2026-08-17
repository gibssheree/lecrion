// apps/api/src/modules/catalog/catalog.service.ts
//
// CatalogService — multi-business product catalog.
//
// Backward compatibility guarantees:
//   • name, price, stock are always present in every normalized product.
//   • available is still derived from stock (and is_stock_tracked).
//   • All new fields (sku, barcode, productType, …) are present but may be
//     null/undefined for old rows — callers must treat them as optional.
//   • searchProducts now also matches sku and barcode if either field is set.
//
// Phase 6A additions:
//   • normalizeProduct now includes categoryId and categoryName.
//   • getAllProducts / searchProducts include category relation via Prisma include.
//   • getProductsByCategoryId() for category-filtered listing.
//   • createProduct / updateProduct accept categoryId.

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  menu as Menu,
  product_categories as CategoryRow,
} from '@prisma/client';
import { ProductType, ProductTypeValue } from '@libs/contracts/src/enums';
import { CreateProductDto, UpdateProductDto } from './catalog.dto';

export { CreateProductDto, UpdateProductDto };

// ── Normalized product shape returned by all catalog queries ──────────────────
export interface NormalizedProduct {
  // ── Legacy / core fields (always present) ────────────────────────────────
  id: number;
  name: string;
  price: number;
  costPrice: number | null;
  displayPrice: number;
  stock: number;
  description: string;
  imageUrl: string | null;
  /** Category string — DB-backed name when categoryId is set, inferred otherwise */
  category: string;
  /** true when the product can be added to a sale */
  available: boolean;

  // ── Generalization fields (nullable for legacy rows) ─────────────────────
  sku: string | null;
  barcode: string | null;
  productType: ProductTypeValue;
  unitName: string | null;
  unitCode: string | null;
  brand: string | null;
  supplierName: string | null;
  supplierId: string | null;
  /** JSON string — parse client-side: size, color, material, grade, etc. */
  attributes: string | null;
  parentProductId: number | null;
  isStockTracked: boolean;
  isActive: boolean;

  // ── Phase 6A: category FK ─────────────────────────────────────────────────
  /** DB-backed category ID. Null for legacy rows without a category assigned. */
  categoryId: number | null;
  /** DB-backed category name. Null when categoryId is null. */
  categoryName: string | null;
}

// ── Prisma row type with optional category include ────────────────────────────
type MenuWithCategory = Menu & { category?: CategoryRow | null };

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
    if (
      text.includes('drink') ||
      text.includes('minum') ||
      text.includes('juice') ||
      text.includes('es ')
    )
      return 'Minuman';
    if (
      text.includes('snack') ||
      text.includes('pisang') ||
      text.includes('roti') ||
      text.includes('kentang') ||
      text.includes('pie') ||
      text.includes('ubi')
    )
      return 'Snack';
    return 'Makanan';
  }

  normalizeProduct(row: MenuWithCategory): NormalizedProduct {
    const basePrice = Number(row.price);
    // A product is "available" if:
    //   • is_active is true (defaults true for legacy rows)
    //   • AND either it does not track stock (service) OR has stock > 0
    const isStockTracked = row.is_stock_tracked ?? true;
    const isActive = row.is_active ?? true;
    const available = isActive && (!isStockTracked || Number(row.stock) > 0);

    // Phase 6A: prefer DB-backed category name, fall back to inferred string
    const categoryId = (row as any).category_id ?? null;
    const categoryName = row.category?.name ?? null;
    const category =
      categoryName ?? this.inferCategory(row.name, row.image_url);

    return {
      // ── Core / legacy fields ─────────────────────────────────────────────
      id: Number(row.id),
      name: row.name,
      price: basePrice,
      costPrice: row.cost_price ?? null,
      displayPrice: this.toDisplayRupiah(basePrice),
      stock: Number(row.stock),
      description: row.description || '',
      imageUrl: row.image_url || null,
      category,
      available,

      // ── Generalization fields ────────────────────────────────────────────
      sku: row.sku ?? null,
      barcode: row.barcode ?? null,
      productType: (row.product_type || 'simple') as ProductTypeValue,
      unitName: row.unit_name ?? null,
      unitCode: row.unit_code ?? null,
      brand: row.brand ?? null,
      supplierName: row.supplier_name ?? null,
      supplierId: row.supplier_id ?? null,
      attributes: row.attributes ?? null,
      parentProductId: row.parent_product_id ?? null,
      isStockTracked,
      isActive,

      // ── Phase 6A: category FK ────────────────────────────────────────────
      categoryId,
      categoryName,
    };
  }

  async getAllProducts(
    storeId: string,
    includeInactive = false,
  ): Promise<NormalizedProduct[]> {
    const rows = await this.prisma.menu.findMany({
      where: { store_id: storeId, ...(includeInactive ? {} : { is_active: true }) },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.normalizeProduct(r));
  }

  /**
   * `storeId` is required (SEC-05) — a product id alone is not enough to
   * decide whether the caller may see it. Returns null (not found) rather
   * than a distinct "forbidden" so a store can't probe which ids belong to
   * another store.
   */
  async getProductById(
    id: number,
    storeId: string,
  ): Promise<NormalizedProduct | null> {
    const row = await this.prisma.menu.findFirst({
      where: { id, store_id: storeId },
      include: { category: true },
    });
    return row ? this.normalizeProduct(row) : null;
  }

  /**
   * Phase 6A: Get all products in a specific category.
   * Returns empty array if category does not exist.
   */
  async getProductsByCategoryId(
    categoryId: number,
    storeId: string,
    includeInactive = false,
  ): Promise<NormalizedProduct[]> {
    const rows = await this.prisma.menu.findMany({
      where: {
        category_id: categoryId,
        store_id: storeId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.normalizeProduct(r));
  }

  async findProductByName(
    keyword: string,
    storeId: string,
  ): Promise<NormalizedProduct | null> {
    if (!keyword?.trim()) return null;
    const rows = await this.prisma.menu.findMany({
      where: {
        name: { contains: keyword.trim() },
        store_id: storeId,
      },
      include: { category: true },
      orderBy: [{ stock: 'desc' }, { id: 'asc' }],
      take: 1,
    });
    return rows.length ? this.normalizeProduct(rows[0]) : null;
  }

  /**
   * Full-text product search.
   * Phase 6A: Matches name, description, sku, barcode.
   * Also checks product_barcodes table for secondary barcodes.
   *
   * Backward compatible: if sku/barcode are NULL on old rows the OR clauses
   * simply don't match — no errors.
   */
  async searchProducts(
    keyword: string,
    storeId: string,
    limit = 8,
  ): Promise<NormalizedProduct[]> {
    const q = (keyword || '').trim();

    // Check if the query looks like a barcode (digits only, 8-14 chars)
    // If so, also search product_barcodes table for secondary barcodes
    const looksLikeBarcode = /^\d{8,14}$/.test(q);

    let extraProductIds: number[] = [];
    if (looksLikeBarcode) {
      const barcodeRows = await this.prisma.product_barcodes.findMany({
        where: { barcode: q, menu: { store_id: storeId } },
        select: { menu_id: true },
      });
      extraProductIds = barcodeRows.map((r) => r.menu_id);
    }

    const rows = await this.prisma.menu.findMany({
      where: {
        is_active: true,
        store_id: storeId,
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { sku: { contains: q } },
          { barcode: { equals: q } },
          ...(extraProductIds.length ? [{ id: { in: extraProductIds } }] : []),
        ],
      },
      include: { category: true },
      orderBy: [{ stock: 'desc' }, { name: 'asc' }],
      take: Number(limit) || 8,
    });
    return rows.map((r) => this.normalizeProduct(r));
  }

  async getCatalogContext(storeId: string, limit = 25): Promise<string> {
    const rows = await this.prisma.menu.findMany({
      where: { is_active: true, store_id: storeId },
      orderBy: [{ stock: 'desc' }, { name: 'asc' }],
      take: Number(limit) || 25,
    });
    if (!rows.length) return 'Belum ada produk tersedia.';
    return rows
      .map((row) => {
        const isTracked = row.is_stock_tracked ?? true;
        const stockText = !isTracked
          ? 'layanan (tanpa stok)'
          : Number(row.stock) > 0
            ? `stok ${row.stock}`
            : 'stok habis';
        return `#${row.id} ${row.name} - Rp${this.formatRupiah(Number(row.price))} (${stockText})`;
      })
      .join('\n');
  }

  async getCatalogForStore(storeId: string): Promise<NormalizedProduct[]> {
    return this.getAllProducts(storeId);
  }

  /** Caller must have already verified `id` belongs to the caller's store. */
  async updateStock(id: number, stock: number): Promise<Menu> {
    return this.prisma.menu.update({
      where: { id },
      data: { stock },
    });
  }

  // ── Product create/update foundation ────────────────────────────────────────

  /**
   * Field-level validation shared by the single-product endpoints and the
   * bulk import pipeline — one source of truth so the two paths can never
   * disagree on what a "valid" product looks like.
   *
   * Returns a list of human-readable problems; empty means valid. Does not
   * throw so bulk import can collect per-row errors instead of aborting.
   */
  validateProductInput(
    dto: Partial<CreateProductDto>,
    { requireCore = true }: { requireCore?: boolean } = {},
  ): string[] {
    const problems: string[] = [];

    if (dto.name !== undefined || requireCore) {
      if (!dto.name || !String(dto.name).trim()) {
        problems.push('name is required');
      } else if (String(dto.name).trim().length > 200) {
        problems.push('name must be 200 characters or fewer');
      }
    }

    if (dto.price !== undefined || requireCore) {
      if (dto.price === undefined || dto.price === null) {
        problems.push('price is required');
      } else if (!Number.isFinite(Number(dto.price)) || Number(dto.price) < 0) {
        problems.push('price must be a non-negative number');
      }
    }

    if (
      dto.costPrice !== undefined &&
      dto.costPrice !== null &&
      (!Number.isFinite(Number(dto.costPrice)) || Number(dto.costPrice) < 0)
    ) {
      problems.push('costPrice must be a non-negative number');
    }

    if (
      dto.stock !== undefined &&
      dto.stock !== null &&
      (!Number.isFinite(Number(dto.stock)) || Number(dto.stock) < 0)
    ) {
      problems.push('stock must be a non-negative number');
    }

    if (dto.sku !== undefined && dto.sku !== null && String(dto.sku).length > 100) {
      problems.push('sku must be 100 characters or fewer');
    }

    if (
      dto.barcode !== undefined &&
      dto.barcode !== null &&
      String(dto.barcode).length > 100
    ) {
      problems.push('barcode must be 100 characters or fewer');
    }

    return problems;
  }

  assertValidProductInput(
    dto: Partial<CreateProductDto>,
    opts?: { requireCore?: boolean },
  ): void {
    const problems = this.validateProductInput(dto, opts);
    if (problems.length) {
      throw new BadRequestException(problems);
    }
  }

  /**
   * Checks whether `sku`/`barcode` already belong to a different product
   * IN THE SAME STORE. There is no DB-level unique constraint on
   * menu.sku/menu.barcode (only an index), so this must be enforced here —
   * checked by both the single create/update endpoints and the bulk import
   * commit path. Scoped per store so two different merchants can each use
   * "COFFEE-001" without colliding.
   */
  async findSkuOrBarcodeConflict(
    sku: string | null | undefined,
    barcode: string | null | undefined,
    storeId: string,
    excludeId?: number,
  ): Promise<{ field: 'sku' | 'barcode'; value: string } | null> {
    const trimmedSku = sku?.trim();
    if (trimmedSku) {
      const conflict = await this.prisma.menu.findFirst({
        where: {
          sku: trimmedSku,
          store_id: storeId,
          ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (conflict) return { field: 'sku', value: trimmedSku };
    }

    const trimmedBarcode = barcode?.trim();
    if (trimmedBarcode) {
      const conflict = await this.prisma.menu.findFirst({
        where: {
          barcode: trimmedBarcode,
          store_id: storeId,
          ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (conflict) return { field: 'barcode', value: trimmedBarcode };
    }

    return null;
  }

  async createProduct(
    dto: CreateProductDto,
    storeId: string,
  ): Promise<NormalizedProduct> {
    this.assertValidProductInput(dto);
    const conflict = await this.findSkuOrBarcodeConflict(
      dto.sku,
      dto.barcode,
      storeId,
    );
    if (conflict) {
      throw new ConflictException(
        `${conflict.field} "${conflict.value}" is already used by another product`,
      );
    }

    const row = await this.prisma.menu.create({
      data: {
        name: dto.name,
        price: dto.price,
        cost_price: dto.costPrice ?? null,
        stock: dto.stock ?? 0,
        description: dto.description ?? null,
        image_url: dto.imageUrl ?? null,
        store_id: storeId,
        sku: dto.sku ?? null,
        barcode: dto.barcode ?? null,
        product_type: dto.productType ?? ProductType.SIMPLE,
        unit_name: dto.unitName ?? null,
        unit_code: dto.unitCode ?? null,
        brand: dto.brand ?? null,
        supplier_name: dto.supplierName ?? null,
        supplier_id: dto.supplierId ?? null,
        attributes: dto.attributes ?? null,
        parent_product_id: dto.parentProductId ?? null,
        is_stock_tracked: dto.isStockTracked ?? true,
        is_active: dto.isActive ?? true,
        // Phase 6A
        category_id: dto.categoryId ?? null,
      },
      include: { category: true },
    });
    return this.normalizeProduct(row);
  }

  async updateProduct(
    id: number,
    dto: UpdateProductDto,
    storeId: string,
  ): Promise<NormalizedProduct | null> {
    const existing = await this.prisma.menu.findFirst({
      where: { id, store_id: storeId },
    });
    if (!existing) return null;

    this.assertValidProductInput(dto, { requireCore: false });
    if (dto.sku !== undefined || dto.barcode !== undefined) {
      const conflict = await this.findSkuOrBarcodeConflict(
        dto.sku !== undefined ? dto.sku : existing.sku,
        dto.barcode !== undefined ? dto.barcode : existing.barcode,
        storeId,
        id,
      );
      if (conflict) {
        throw new ConflictException(
          `${conflict.field} "${conflict.value}" is already used by another product`,
        );
      }
    }

    const row = await this.prisma.menu.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.costPrice !== undefined && { cost_price: dto.costPrice }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { image_url: dto.imageUrl }),
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.barcode !== undefined && { barcode: dto.barcode }),
        ...(dto.productType !== undefined && { product_type: dto.productType }),
        ...(dto.unitName !== undefined && { unit_name: dto.unitName }),
        ...(dto.unitCode !== undefined && { unit_code: dto.unitCode }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.supplierName !== undefined && {
          supplier_name: dto.supplierName,
        }),
        ...(dto.supplierId !== undefined && { supplier_id: dto.supplierId }),
        ...(dto.attributes !== undefined && { attributes: dto.attributes }),
        ...(dto.parentProductId !== undefined && {
          parent_product_id: dto.parentProductId,
        }),
        ...(dto.isStockTracked !== undefined && {
          is_stock_tracked: dto.isStockTracked,
        }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        // Phase 6A
        ...(dto.categoryId !== undefined && { category_id: dto.categoryId }),
      },
      include: { category: true },
    });
    return this.normalizeProduct(row);
  }
}
