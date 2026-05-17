// apps/api/src/modules/customers/customers.service.ts
//
// CustomersService — customer profile CRUD and lookup.
//
// Design rules:
//   • phone is the primary lookup key (unique per store).
//   • Search by name or phone for POS customer drawer.
//   • Tier is managed by LoyaltyService based on total spend.
//   • Soft-delete via is_active = false.

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

// ── Tier constants ────────────────────────────────────────────────────────────
export const CustomerTier = {
  REGULAR: 'regular',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const;
export type CustomerTierValue =
  (typeof CustomerTier)[keyof typeof CustomerTier];

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  storeId?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  tier?: CustomerTierValue;
  isActive?: boolean;
}

// ── Normalized shape ──────────────────────────────────────────────────────────

export interface NormalizedCustomer {
  id: number;
  storeId: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tier: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Current loyalty point balance (computed from ledger) */
  pointBalance?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  normalize(row: any): NormalizedCustomer {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      tier: row.tier ?? CustomerTier.REGULAR,
      notes: row.notes ?? null,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ── Queries ─────────────────────────────────────────────────────────────────

  async search(
    keyword: string,
    storeId = 'default-store',
    limit = 10,
  ): Promise<NormalizedCustomer[]> {
    const q = (keyword || '').trim();
    if (!q) return [];
    const rows = await this.prisma.customers.findMany({
      where: {
        store_id: storeId,
        is_active: true,
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
    return rows.map((r) => this.normalize(r));
  }

  async getById(id: number): Promise<NormalizedCustomer | null> {
    const row = await this.prisma.customers.findUnique({ where: { id } });
    return row ? this.normalize(row) : null;
  }

  async getByPhone(
    phone: string,
    storeId = 'default-store',
  ): Promise<NormalizedCustomer | null> {
    const row = await this.prisma.customers.findFirst({
      where: { phone, store_id: storeId, is_active: true },
    });
    return row ? this.normalize(row) : null;
  }

  async list(
    storeId = 'default-store',
    limit = 50,
    offset = 0,
  ): Promise<NormalizedCustomer[]> {
    const rows = await this.prisma.customers.findMany({
      where: { store_id: storeId, is_active: true },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.normalize(r));
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  async create(dto: CreateCustomerDto): Promise<NormalizedCustomer> {
    const storeId = dto.storeId ?? 'default-store';

    // Phone uniqueness per store
    if (dto.phone) {
      const existing = await this.prisma.customers.findFirst({
        where: { phone: dto.phone, store_id: storeId },
      });
      if (existing) {
        throw new ConflictException(
          `Customer with phone "${dto.phone}" already exists`,
        );
      }
    }

    const now = new Date().toISOString();
    const row = await this.prisma.customers.create({
      data: {
        store_id: storeId,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
        tier: CustomerTier.REGULAR,
        updated_at: now,
      },
    });
    return this.normalize(row);
  }

  async update(
    id: number,
    dto: UpdateCustomerDto,
  ): Promise<NormalizedCustomer | null> {
    const existing = await this.prisma.customers.findUnique({ where: { id } });
    if (!existing) return null;

    // Phone uniqueness check if changing
    if (dto.phone && dto.phone !== existing.phone) {
      const conflict = await this.prisma.customers.findFirst({
        where: {
          phone: dto.phone,
          store_id: existing.store_id,
          id: { not: id },
        },
      });
      if (conflict)
        throw new ConflictException(
          `Phone "${dto.phone}" already used by another customer`,
        );
    }

    const row = await this.prisma.customers.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.tier !== undefined && { tier: dto.tier }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        updated_at: new Date().toISOString(),
      },
    });
    return this.normalize(row);
  }

  async deactivate(id: number): Promise<NormalizedCustomer | null> {
    const existing = await this.prisma.customers.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.prisma.customers.update({
      where: { id },
      data: { is_active: false, updated_at: new Date().toISOString() },
    });
    return this.normalize(row);
  }

  /** Get purchase history for a customer (recent pos_sales) */
  async getPurchaseHistory(customerId: number, limit = 20) {
    return this.prisma.pos_sales.findMany({
      where: { customer_id: customerId },
      include: { pos_sale_items: true },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
