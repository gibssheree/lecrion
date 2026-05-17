// apps/api/src/modules/fnb/tables.service.ts
//
// TablesService — manage dining areas and tables for F&B vertical.
//
// Design rules:
//   • table_number must be unique per store.
//   • Status transitions are validated (can't go occupied→available directly
//     without cleaning step, but we allow it for simplicity in v1).
//   • Soft-delete via is_active = false.
//   • getAvailableTables() is the fast path for POS table selector.

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  DiningTableStatus,
  DiningTableStatusValue,
  DINING_TABLE_STATUS_VALUES,
} from './fnb.types';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateAreaDto {
  name: string;
  description?: string;
  sortOrder?: number;
  storeId?: string;
}

export interface CreateTableDto {
  tableNumber: string;
  areaId?: number | null;
  capacity?: number;
  storeId?: string;
}

export interface UpdateTableDto {
  tableNumber?: string;
  areaId?: number | null;
  capacity?: number;
  isActive?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Areas ──────────────────────────────────────────────────────────────────

  async getAreas(storeId = 'default-store') {
    return this.prisma.dining_areas.findMany({
      where: { store_id: storeId, is_active: true },
      include: {
        tables: {
          where: { is_active: true },
          orderBy: { table_number: 'asc' },
        },
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }

  async createArea(dto: CreateAreaDto) {
    const storeId = dto.storeId ?? 'default-store';
    return this.prisma.dining_areas.create({
      data: {
        store_id: storeId,
        name: dto.name,
        description: dto.description ?? null,
        sort_order: dto.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async updateArea(id: number, data: Partial<CreateAreaDto>) {
    const existing = await this.prisma.dining_areas.findUnique({
      where: { id },
    });
    if (!existing) return null;
    return this.prisma.dining_areas.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.sortOrder !== undefined && { sort_order: data.sortOrder }),
        updated_at: new Date().toISOString(),
      },
    });
  }

  async deactivateArea(id: number) {
    const existing = await this.prisma.dining_areas.findUnique({
      where: { id },
    });
    if (!existing) return null;
    return this.prisma.dining_areas.update({
      where: { id },
      data: { is_active: false, updated_at: new Date().toISOString() },
    });
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

  async getTables(storeId = 'default-store', includeInactive = false) {
    return this.prisma.dining_tables.findMany({
      where: {
        store_id: storeId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      include: { area: true },
      orderBy: [{ area_id: 'asc' }, { table_number: 'asc' }],
    });
  }

  async getAvailableTables(storeId = 'default-store') {
    return this.prisma.dining_tables.findMany({
      where: {
        store_id: storeId,
        is_active: true,
        status: DiningTableStatus.AVAILABLE,
      },
      include: { area: true },
      orderBy: [{ area_id: 'asc' }, { table_number: 'asc' }],
    });
  }

  async getTableById(id: number) {
    return this.prisma.dining_tables.findUnique({
      where: { id },
      include: { area: true },
    });
  }

  async createTable(dto: CreateTableDto) {
    const storeId = dto.storeId ?? 'default-store';

    // Check uniqueness
    const existing = await this.prisma.dining_tables.findFirst({
      where: { store_id: storeId, table_number: dto.tableNumber },
    });
    if (existing) {
      throw new ConflictException(
        `Table "${dto.tableNumber}" already exists in store "${storeId}"`,
      );
    }

    // Validate area if provided
    if (dto.areaId != null) {
      const area = await this.prisma.dining_areas.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) throw new NotFoundException(`Area ${dto.areaId} not found`);
    }

    return this.prisma.dining_tables.create({
      data: {
        store_id: storeId,
        table_number: dto.tableNumber,
        area_id: dto.areaId ?? null,
        capacity: dto.capacity ?? 4,
        status: DiningTableStatus.AVAILABLE,
        updated_at: new Date().toISOString(),
      },
      include: { area: true },
    });
  }

  async updateTable(id: number, dto: UpdateTableDto) {
    const existing = await this.prisma.dining_tables.findUnique({
      where: { id },
    });
    if (!existing) return null;

    // Check uniqueness if table_number is changing
    if (dto.tableNumber && dto.tableNumber !== existing.table_number) {
      const conflict = await this.prisma.dining_tables.findFirst({
        where: {
          store_id: existing.store_id,
          table_number: dto.tableNumber,
          id: { not: id },
        },
      });
      if (conflict)
        throw new ConflictException(
          `Table "${dto.tableNumber}" already exists`,
        );
    }

    return this.prisma.dining_tables.update({
      where: { id },
      data: {
        ...(dto.tableNumber !== undefined && { table_number: dto.tableNumber }),
        ...(dto.areaId !== undefined && { area_id: dto.areaId }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        updated_at: new Date().toISOString(),
      },
      include: { area: true },
    });
  }

  async setTableStatus(id: number, status: DiningTableStatusValue) {
    if (!DINING_TABLE_STATUS_VALUES.includes(status)) {
      throw new BadRequestException(
        `Invalid status "${status}". Valid: ${DINING_TABLE_STATUS_VALUES.join(', ')}`,
      );
    }
    const existing = await this.prisma.dining_tables.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Table ${id} not found`);

    return this.prisma.dining_tables.update({
      where: { id },
      data: { status, updated_at: new Date().toISOString() },
      include: { area: true },
    });
  }
}
