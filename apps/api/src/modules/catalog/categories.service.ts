// apps/api/src/modules/catalog/categories.service.ts
//
// CategoriesService — CRUD for product_categories.
//
// Design rules:
//   • Slug is auto-generated from name if not provided (slugify).
//   • Slug must be unique per store.
//   • Hierarchical: parent_id = null means top-level.
//   • Soft-delete via is_active = false (no hard deletes).
//   • getTree() returns a nested tree for UI rendering.
//   • getFlat() returns a flat list for dropdowns and API responses.
//   • Backward compat: CatalogService.inferCategory() still works when
//     category_id is null — this service is additive.

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { product_categories as CategoryRow } from '@prisma/client';

// ── Normalized shapes ─────────────────────────────────────────────────────────

export interface NormalizedCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends NormalizedCategory {
  children: CategoryTreeNode[];
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  storeId?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Slug helpers ────────────────────────────────────────────────────────────

  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  normalize(row: CategoryRow): NormalizedCategory {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      parentId: row.parent_id ?? null,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      storeId: row.store_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async getFlat(
    storeId = 'default-store',
    includeInactive = false,
  ): Promise<NormalizedCategory[]> {
    const rows = await this.prisma.product_categories.findMany({
      where: {
        store_id: storeId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.normalize(r));
  }

  async getTree(
    storeId = 'default-store',
    includeInactive = false,
  ): Promise<CategoryTreeNode[]> {
    const flat = await this.getFlat(storeId, includeInactive);
    return this.buildTree(flat, null);
  }

  private buildTree(
    flat: NormalizedCategory[],
    parentId: number | null,
  ): CategoryTreeNode[] {
    return flat
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        ...c,
        children: this.buildTree(flat, c.id),
      }));
  }

  async getById(id: number): Promise<NormalizedCategory | null> {
    const row = await this.prisma.product_categories.findUnique({
      where: { id },
    });
    return row ? this.normalize(row) : null;
  }

  async getBySlug(
    slug: string,
    storeId = 'default-store',
  ): Promise<NormalizedCategory | null> {
    const row = await this.prisma.product_categories.findFirst({
      where: { slug, store_id: storeId },
    });
    return row ? this.normalize(row) : null;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async create(dto: CreateCategoryDto): Promise<NormalizedCategory> {
    const storeId = dto.storeId ?? 'default-store';
    const slug = dto.slug?.trim() || this.slugify(dto.name);

    // Ensure slug is unique per store
    const existing = await this.prisma.product_categories.findFirst({
      where: { slug, store_id: storeId },
    });
    if (existing) {
      throw new ConflictException(
        `Category slug "${slug}" already exists in store "${storeId}"`,
      );
    }

    // Validate parent exists if provided
    if (dto.parentId != null) {
      const parent = await this.prisma.product_categories.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category ${dto.parentId} not found`,
        );
      }
    }

    const row = await this.prisma.product_categories.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        parent_id: dto.parentId ?? null,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
        store_id: storeId,
        updated_at: new Date().toISOString(),
      },
    });
    return this.normalize(row);
  }

  async update(
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<NormalizedCategory | null> {
    const existing = await this.prisma.product_categories.findUnique({
      where: { id },
    });
    if (!existing) return null;

    // If slug is changing, check uniqueness
    if (dto.slug && dto.slug !== existing.slug) {
      const storeId = dto.storeId ?? existing.store_id;
      const conflict = await this.prisma.product_categories.findFirst({
        where: { slug: dto.slug, store_id: storeId, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Category slug "${dto.slug}" already exists`,
        );
      }
    }

    // Prevent circular parent reference
    if (dto.parentId != null && dto.parentId === id) {
      throw new ConflictException('A category cannot be its own parent');
    }

    const row = await this.prisma.product_categories.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.parentId !== undefined && { parent_id: dto.parentId }),
        ...(dto.sortOrder !== undefined && { sort_order: dto.sortOrder }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        updated_at: new Date().toISOString(),
      },
    });
    return this.normalize(row);
  }

  /**
   * Soft-delete: set is_active = false.
   * Does NOT cascade to products — products keep their category_id.
   * Products with a deactivated category fall back to inferCategory() in the UI.
   */
  async deactivate(id: number): Promise<NormalizedCategory | null> {
    const existing = await this.prisma.product_categories.findUnique({
      where: { id },
    });
    if (!existing) return null;
    const row = await this.prisma.product_categories.update({
      where: { id },
      data: { is_active: false, updated_at: new Date().toISOString() },
    });
    return this.normalize(row);
  }

  // ── Product count per category ────────────────────────────────────────────

  async getProductCount(categoryId: number): Promise<number> {
    return this.prisma.menu.count({
      where: { category_id: categoryId, is_active: true },
    });
  }
}
