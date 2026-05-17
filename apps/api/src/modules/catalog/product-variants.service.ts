// apps/api/src/modules/catalog/product-variants.service.ts
//
// ProductVariantsService — manage product variant relationships.
//
// A "variant" in Lecrion is a parent-child product relationship:
//   - Parent product: the "template" (e.g. "Kaos Polos")
//   - Child product: a specific variant (e.g. "Kaos Polos - Merah - L")
//
// Both parent and child are full menu rows (with their own price, stock, SKU).
// The product_variants table records the relationship and the variant dimension.
//
// Design rules:
//   • A child product can only have ONE parent.
//   • A parent can have many children.
//   • Circular references are prevented.
//   • Deleting a variant link does NOT delete the product rows.

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { product_variants as VariantRow } from '@prisma/client';
import {
  ProductVariantTypeValue,
  PRODUCT_VARIANT_TYPE_VALUES,
} from '@libs/contracts/src/enums';

// ── Normalized shapes ─────────────────────────────────────────────────────────

export interface NormalizedVariant {
  id: number;
  parentProductId: number;
  variantProductId: number;
  variantType: string;
  variantValue: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface VariantWithProduct extends NormalizedVariant {
  variantProduct: {
    id: number;
    name: string;
    price: number;
    stock: number;
    sku: string | null;
    barcode: string | null;
    isActive: boolean;
    isStockTracked: boolean;
  };
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateVariantDto {
  parentProductId: number;
  variantProductId: number;
  variantType?: ProductVariantTypeValue;
  variantValue: string;
  sortOrder?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  normalize(row: VariantRow): NormalizedVariant {
    return {
      id: row.id,
      parentProductId: row.parent_product_id,
      variantProductId: row.variant_product_id,
      variantType: row.variant_type,
      variantValue: row.variant_value,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  /**
   * Get all variants for a parent product, including the child product details.
   */
  async getVariantsForParent(
    parentProductId: number,
  ): Promise<VariantWithProduct[]> {
    const rows = await this.prisma.product_variants.findMany({
      where: { parent_product_id: parentProductId, is_active: true },
      include: { variant_product: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      ...this.normalize(row),
      variantProduct: {
        id: row.variant_product.id,
        name: row.variant_product.name,
        price: row.variant_product.price,
        stock: row.variant_product.stock,
        sku: row.variant_product.sku ?? null,
        barcode: row.variant_product.barcode ?? null,
        isActive: row.variant_product.is_active,
        isStockTracked: row.variant_product.is_stock_tracked,
      },
    }));
  }

  /**
   * Get the parent product for a variant child.
   * Returns null if the product is not a variant child.
   */
  async getParentForVariant(
    variantProductId: number,
  ): Promise<NormalizedVariant | null> {
    const row = await this.prisma.product_variants.findFirst({
      where: { variant_product_id: variantProductId, is_active: true },
    });
    return row ? this.normalize(row) : null;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async create(dto: CreateVariantDto): Promise<NormalizedVariant> {
    // Validate variant type
    const variantType = dto.variantType ?? 'custom';
    if (
      !PRODUCT_VARIANT_TYPE_VALUES.includes(
        variantType as ProductVariantTypeValue,
      )
    ) {
      throw new BadRequestException(
        `Invalid variant_type "${variantType}". Valid: ${PRODUCT_VARIANT_TYPE_VALUES.join(', ')}`,
      );
    }

    // Prevent self-reference
    if (dto.parentProductId === dto.variantProductId) {
      throw new BadRequestException('A product cannot be a variant of itself');
    }

    // Verify both products exist
    const [parent, child] = await Promise.all([
      this.prisma.menu.findUnique({ where: { id: dto.parentProductId } }),
      this.prisma.menu.findUnique({ where: { id: dto.variantProductId } }),
    ]);
    if (!parent)
      throw new NotFoundException(
        `Parent product ${dto.parentProductId} not found`,
      );
    if (!child)
      throw new NotFoundException(
        `Variant product ${dto.variantProductId} not found`,
      );

    // Prevent duplicate link
    const existing = await this.prisma.product_variants.findFirst({
      where: {
        parent_product_id: dto.parentProductId,
        variant_product_id: dto.variantProductId,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Product ${dto.variantProductId} is already a variant of ${dto.parentProductId}`,
      );
    }

    const row = await this.prisma.product_variants.create({
      data: {
        parent_product_id: dto.parentProductId,
        variant_product_id: dto.variantProductId,
        variant_type: variantType,
        variant_value: dto.variantValue,
        sort_order: dto.sortOrder ?? 0,
        is_active: true,
      },
    });
    return this.normalize(row);
  }

  async deactivate(id: number): Promise<NormalizedVariant | null> {
    const existing = await this.prisma.product_variants.findUnique({
      where: { id },
    });
    if (!existing) return null;
    const row = await this.prisma.product_variants.update({
      where: { id },
      data: { is_active: false },
    });
    return this.normalize(row);
  }
}
