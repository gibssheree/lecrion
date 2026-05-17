// apps/api/src/modules/catalog/product-barcodes.service.ts
//
// ProductBarcodesService — manage additional barcodes per product.
//
// The primary barcode is stored in menu.barcode for fast lookup.
// This service manages the product_barcodes table for secondary/alias barcodes.
//
// Design rules:
//   • A barcode string must be globally unique across all products.
//   • A product can have multiple barcodes (EAN-13, QR, internal, etc.).
//   • resolveByBarcode() checks both menu.barcode AND product_barcodes.
//   • Deleting a barcode row does NOT delete the product.

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { product_barcodes as BarcodeRow } from '@prisma/client';
import {
  BarcodeTypeValue,
  BARCODE_TYPE_VALUES,
} from '@libs/contracts/src/enums';

// ── Normalized shapes ─────────────────────────────────────────────────────────

export interface NormalizedBarcode {
  id: number;
  menuId: number;
  barcode: string;
  barcodeType: string;
  isPrimary: boolean;
  createdAt: string;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface AddBarcodeDto {
  menuId: number;
  barcode: string;
  barcodeType?: BarcodeTypeValue;
  isPrimary?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ProductBarcodesService {
  constructor(private readonly prisma: PrismaService) {}

  normalize(row: BarcodeRow): NormalizedBarcode {
    return {
      id: row.id,
      menuId: row.menu_id,
      barcode: row.barcode,
      barcodeType: row.barcode_type,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    };
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async getBarcodesForProduct(menuId: number): Promise<NormalizedBarcode[]> {
    const rows = await this.prisma.product_barcodes.findMany({
      where: { menu_id: menuId },
      orderBy: [{ is_primary: 'desc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.normalize(r));
  }

  /**
   * Resolve a barcode string to a product ID.
   * Checks menu.barcode first (fast path), then product_barcodes table.
   * Returns null if not found.
   */
  async resolveByBarcode(barcode: string): Promise<number | null> {
    // Fast path: check menu.barcode column
    const menuRow = await this.prisma.menu.findFirst({
      where: { barcode, is_active: true },
      select: { id: true },
    });
    if (menuRow) return menuRow.id;

    // Slow path: check product_barcodes table
    const barcodeRow = await this.prisma.product_barcodes.findFirst({
      where: { barcode },
    });
    if (barcodeRow) {
      // Verify the product is still active
      const product = await this.prisma.menu.findFirst({
        where: { id: barcodeRow.menu_id, is_active: true },
        select: { id: true },
      });
      return product?.id ?? null;
    }

    return null;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async addBarcode(dto: AddBarcodeDto): Promise<NormalizedBarcode> {
    const barcodeType = dto.barcodeType ?? 'ean13';
    if (!BARCODE_TYPE_VALUES.includes(barcodeType as BarcodeTypeValue)) {
      throw new NotFoundException(
        `Invalid barcode_type "${barcodeType}". Valid: ${BARCODE_TYPE_VALUES.join(', ')}`,
      );
    }

    // Verify product exists
    const product = await this.prisma.menu.findUnique({
      where: { id: dto.menuId },
    });
    if (!product)
      throw new NotFoundException(`Product ${dto.menuId} not found`);

    // Check global barcode uniqueness
    const existingBarcode = await this.prisma.product_barcodes.findFirst({
      where: { barcode: dto.barcode },
    });
    if (existingBarcode) {
      throw new ConflictException(
        `Barcode "${dto.barcode}" is already assigned to product ${existingBarcode.menu_id}`,
      );
    }
    // Also check menu.barcode column
    const existingMenu = await this.prisma.menu.findFirst({
      where: { barcode: dto.barcode, id: { not: dto.menuId } },
    });
    if (existingMenu) {
      throw new ConflictException(
        `Barcode "${dto.barcode}" is already the primary barcode of product ${existingMenu.id}`,
      );
    }

    const row = await this.prisma.product_barcodes.create({
      data: {
        menu_id: dto.menuId,
        barcode: dto.barcode,
        barcode_type: barcodeType,
        is_primary: dto.isPrimary ?? false,
      },
    });
    return this.normalize(row);
  }

  async removeBarcode(id: number): Promise<boolean> {
    const existing = await this.prisma.product_barcodes.findUnique({
      where: { id },
    });
    if (!existing) return false;
    await this.prisma.product_barcodes.delete({ where: { id } });
    return true;
  }
}
