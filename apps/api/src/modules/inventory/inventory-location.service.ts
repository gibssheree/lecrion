// apps/api/src/modules/inventory/inventory-location.service.ts
//
// InventoryLocationService — manages inventory_locations and provides the
// "ensure default location" helper used by InventoryLedgerService.
//
// Design rules:
//   1. Every store has exactly one default location (is_default = true).
//   2. ensureDefaultLocation() is idempotent — safe to call on every write.
//   3. Location names are unique per store (enforced at service level).
//   4. Deactivating a location does not delete its stock_change_logs rows.

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  InventoryLocationType,
  InventoryLocationTypeValue,
  INVENTORY_LOCATION_TYPE_VALUES,
} from '@libs/contracts/src/enums';

export interface LocationRecord {
  id: number;
  storeId: string;
  name: string;
  type: InventoryLocationTypeValue;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateLocationDto {
  storeId?: string;
  name: string;
  type?: InventoryLocationTypeValue;
  isDefault?: boolean;
}

@Injectable()
export class InventoryLocationService {
  private readonly logger = new Logger(InventoryLocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Ensure default location ───────────────────────────────────────────────

  /**
   * Return the default location for a store, creating it if it does not exist.
   *
   * This is the primary entry point for InventoryLedgerService when no
   * explicit locationId is provided. It is idempotent and safe to call
   * inside a Prisma transaction.
   */
  async ensureDefaultLocation(
    storeId: string,
    tx?: any,
  ): Promise<LocationRecord> {
    const db = tx ?? this.prisma;

    const existing = await db.inventory_locations.findFirst({
      where: { store_id: storeId, is_default: true, is_active: true },
    });

    if (existing) return this.toRecord(existing);

    // Create the default warehouse location for this store
    const created = await db.inventory_locations.create({
      data: {
        store_id: storeId,
        name: 'Gudang Utama',
        type: InventoryLocationType.WAREHOUSE,
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Created default location #${created.id} for store ${storeId}`,
    );
    return this.toRecord(created);
  }

  // ── List locations ────────────────────────────────────────────────────────

  async listLocations(storeId?: string): Promise<LocationRecord[]> {
    const rows = await this.prisma.inventory_locations.findMany({
      where: {
        ...(storeId ? { store_id: storeId } : {}),
        is_active: true,
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.toRecord(r));
  }

  async getLocationById(id: number): Promise<LocationRecord> {
    const row = await this.prisma.inventory_locations.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException(`Location #${id} not found`);
    return this.toRecord(row);
  }

  // ── Create location ───────────────────────────────────────────────────────

  async createLocation(dto: CreateLocationDto): Promise<LocationRecord> {
    const storeId = dto.storeId ?? 'default-store';
    const type = dto.type ?? InventoryLocationType.WAREHOUSE;

    if (!INVENTORY_LOCATION_TYPE_VALUES.includes(type)) {
      throw new BadRequestException(
        `Invalid location type "${type}". Valid: ${INVENTORY_LOCATION_TYPE_VALUES.join(', ')}`,
      );
    }

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Location name is required');

    // Check for duplicate name in same store
    const duplicate = await this.prisma.inventory_locations.findFirst({
      where: { store_id: storeId, name, is_active: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        `Location "${name}" already exists in store ${storeId}`,
      );
    }

    // If this is marked as default, unset existing default first
    if (dto.isDefault) {
      await this.prisma.inventory_locations.updateMany({
        where: { store_id: storeId, is_default: true },
        data: { is_default: false },
      });
    }

    const row = await this.prisma.inventory_locations.create({
      data: {
        store_id: storeId,
        name,
        type,
        is_default: dto.isDefault ?? false,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Created location #${row.id} "${name}" (${type}) for store ${storeId}`,
    );
    return this.toRecord(row);
  }

  // ── Deactivate location ───────────────────────────────────────────────────

  async deactivateLocation(id: number): Promise<LocationRecord> {
    const row = await this.prisma.inventory_locations.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException(`Location #${id} not found`);
    if (row.is_default) {
      throw new BadRequestException(
        'Cannot deactivate the default location. Set another location as default first.',
      );
    }

    const updated = await this.prisma.inventory_locations.update({
      where: { id },
      data: { is_active: false },
    });
    return this.toRecord(updated);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private toRecord(row: {
    id: number;
    store_id: string;
    name: string;
    type: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
  }): LocationRecord {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      type: row.type as InventoryLocationTypeValue,
      isDefault: row.is_default,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
