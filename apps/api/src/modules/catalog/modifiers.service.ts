// apps/api/src/modules/catalog/modifiers.service.ts
//
// ModifiersService — manage modifier groups, options, and product links.
//
// Modifier domain:
//   • modifier_groups: one row per logical group ("Topping", "Level Pedas").
//   • modifier_options: choices inside a group, with optional price_delta.
//   • product_modifier_links: many-to-many between menu items and groups.
//
// Selection semantics:
//   • selection_type = "single"   → pick at most one (radio).
//   • selection_type = "multiple" → pick zero or more (checkbox).
//   • is_required + min_select / max_select drive validation in POS.
//
// Soft-delete via is_active = false on groups and options.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export interface ModifierOptionDto {
  id?: number;
  name: string;
  priceDelta?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateModifierGroupDto {
  storeId?: string;
  name: string;
  description?: string;
  selectionType?: 'single' | 'multiple';
  isRequired?: boolean;
  minSelect?: number;
  maxSelect?: number | null;
  sortOrder?: number;
  options?: ModifierOptionDto[];
}

export interface UpdateModifierGroupDto {
  name?: string;
  description?: string;
  selectionType?: 'single' | 'multiple';
  isRequired?: boolean;
  minSelect?: number;
  maxSelect?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Group queries ─────────────────────────────────────────────────────────

  async listGroups(storeId = 'default-store', includeInactive = false) {
    const rows = await this.prisma.modifier_groups.findMany({
      where: {
        store_id: storeId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      include: {
        options: {
          where: includeInactive ? {} : { is_active: true },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.normalizeGroup(row));
  }

  async getGroupById(id: number) {
    const row = await this.prisma.modifier_groups.findUnique({
      where: { id },
      include: {
        options: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
      },
    });
    return row ? this.normalizeGroup(row) : null;
  }

  // ── Group mutations ───────────────────────────────────────────────────────

  async createGroup(dto: CreateModifierGroupDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Modifier group name is required');

    const selectionType = dto.selectionType ?? 'single';
    if (selectionType !== 'single' && selectionType !== 'multiple') {
      throw new BadRequestException(
        `Invalid selection_type: "${selectionType}"`,
      );
    }

    const now = new Date().toISOString();
    const row = await this.prisma.modifier_groups.create({
      data: {
        store_id: dto.storeId ?? 'default-store',
        name,
        description: dto.description ?? null,
        selection_type: selectionType,
        is_required: dto.isRequired ?? false,
        min_select: dto.minSelect ?? 0,
        max_select: dto.maxSelect ?? null,
        sort_order: dto.sortOrder ?? 0,
        is_active: true,
        created_at: now,
        updated_at: now,
        options: dto.options?.length
          ? {
              create: dto.options.map((option, index) => ({
                name: option.name.trim(),
                price_delta: option.priceDelta ?? 0,
                sort_order: option.sortOrder ?? index,
                is_active: option.isActive ?? true,
                created_at: now,
              })),
            }
          : undefined,
      },
      include: {
        options: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
      },
    });

    return this.normalizeGroup(row);
  }

  async updateGroup(id: number, dto: UpdateModifierGroupDto) {
    const existing = await this.prisma.modifier_groups.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException(`Modifier group ${id} not found`);

    if (
      dto.selectionType &&
      dto.selectionType !== 'single' &&
      dto.selectionType !== 'multiple'
    ) {
      throw new BadRequestException(
        `Invalid selection_type: "${dto.selectionType}"`,
      );
    }

    const row = await this.prisma.modifier_groups.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.selectionType !== undefined && {
          selection_type: dto.selectionType,
        }),
        ...(dto.isRequired !== undefined && { is_required: dto.isRequired }),
        ...(dto.minSelect !== undefined && { min_select: dto.minSelect }),
        ...(dto.maxSelect !== undefined && { max_select: dto.maxSelect }),
        ...(dto.sortOrder !== undefined && { sort_order: dto.sortOrder }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        updated_at: new Date().toISOString(),
      },
      include: {
        options: { orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] },
      },
    });
    return this.normalizeGroup(row);
  }

  async deactivateGroup(id: number) {
    const existing = await this.prisma.modifier_groups.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException(`Modifier group ${id} not found`);
    return this.prisma.modifier_groups.update({
      where: { id },
      data: { is_active: false, updated_at: new Date().toISOString() },
    });
  }

  // ── Option mutations ──────────────────────────────────────────────────────

  async createOption(groupId: number, dto: ModifierOptionDto) {
    const group = await this.prisma.modifier_groups.findUnique({
      where: { id: groupId },
    });
    if (!group)
      throw new NotFoundException(`Modifier group ${groupId} not found`);

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Option name is required');

    return this.prisma.modifier_options.create({
      data: {
        group_id: groupId,
        name,
        price_delta: dto.priceDelta ?? 0,
        sort_order: dto.sortOrder ?? 0,
        is_active: dto.isActive ?? true,
        created_at: new Date().toISOString(),
      },
    });
  }

  async updateOption(id: number, dto: ModifierOptionDto) {
    const existing = await this.prisma.modifier_options.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Option ${id} not found`);

    return this.prisma.modifier_options.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.priceDelta !== undefined && { price_delta: dto.priceDelta }),
        ...(dto.sortOrder !== undefined && { sort_order: dto.sortOrder }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
      },
    });
  }

  async removeOption(id: number) {
    const existing = await this.prisma.modifier_options.findUnique({
      where: { id },
    });
    if (!existing) return false;
    await this.prisma.modifier_options.update({
      where: { id },
      data: { is_active: false },
    });
    return true;
  }

  // ── Product links ─────────────────────────────────────────────────────────

  async listProductLinks(menuId: number) {
    const links = await this.prisma.product_modifier_links.findMany({
      where: { menu_id: menuId },
      include: {
        group: {
          include: {
            options: {
              where: { is_active: true },
              orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    return links.map((link) => ({
      linkId: link.id,
      menuId: link.menu_id,
      sortOrder: link.sort_order,
      group: this.normalizeGroup(link.group),
    }));
  }

  async setProductLinks(menuId: number, groupIds: number[]) {
    const existing = await this.prisma.product_modifier_links.findMany({
      where: { menu_id: menuId },
    });
    const existingGroupIds = new Set(existing.map((link) => link.group_id));
    const desired = new Set(groupIds);

    const toAdd = groupIds.filter((id) => !existingGroupIds.has(id));
    const toRemove = existing
      .filter((link) => !desired.has(link.group_id))
      .map((link) => link.id);

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length) {
        await tx.product_modifier_links.deleteMany({
          where: { id: { in: toRemove } },
        });
      }
      for (const [index, groupId] of toAdd.entries()) {
        await tx.product_modifier_links.create({
          data: {
            menu_id: menuId,
            group_id: groupId,
            sort_order: existing.length + index,
            created_at: new Date().toISOString(),
          },
        });
      }
    });

    return this.listProductLinks(menuId);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private normalizeGroup(row: any) {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      description: row.description ?? null,
      selectionType: row.selection_type,
      isRequired: row.is_required,
      minSelect: row.min_select,
      maxSelect: row.max_select,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      options: Array.isArray(row.options)
        ? row.options.map((option: any) => ({
            id: option.id,
            groupId: option.group_id,
            name: option.name,
            priceDelta: Number(option.price_delta),
            sortOrder: option.sort_order,
            isActive: option.is_active,
          }))
        : [],
    };
  }
}
