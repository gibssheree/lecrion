import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export interface SupplierDto {
  name: string;
  code?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  storeId?: string;
  isActive?: boolean;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  normalize(row: any) {
    return {
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      code: row.code ?? null,
      contactPerson: row.contact_person ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      taxNumber: row.tax_number ?? null,
      notes: row.notes ?? null,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async list(storeId = 'default-store', includeInactive = false, q = '') {
    const where: any = {
      store_id: storeId,
      ...(includeInactive ? {} : { is_active: true }),
    };
    const keyword = q.trim();
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
        { phone: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }
    const rows = await this.prisma.suppliers.findMany({
      where,
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });
    return rows.map((row) => this.normalize(row));
  }

  async create(dto: SupplierDto) {
    const storeId = dto.storeId ?? 'default-store';
    const code = clean(dto.code);
    if (code) {
      const existing = await this.prisma.suppliers.findFirst({
        where: { store_id: storeId, code },
      });
      if (existing) throw new ConflictException('supplier_code_exists');
    }
    const row = await this.prisma.suppliers.create({
      data: {
        store_id: storeId,
        name: dto.name.trim(),
        code,
        contact_person: clean(dto.contactPerson),
        phone: clean(dto.phone),
        email: clean(dto.email),
        address: clean(dto.address),
        tax_number: clean(dto.taxNumber),
        notes: clean(dto.notes),
        is_active: dto.isActive ?? true,
        updated_at: new Date().toISOString(),
      },
    });
    return this.normalize(row);
  }

  async update(id: number, dto: Partial<SupplierDto>) {
    const existing = await this.prisma.suppliers.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('supplier_not_found');

    const code = dto.code === undefined ? undefined : clean(dto.code);
    const storeId = dto.storeId ?? existing.store_id;
    if (code) {
      const duplicate = await this.prisma.suppliers.findFirst({
        where: { store_id: storeId, code, id: { not: id } },
      });
      if (duplicate) throw new ConflictException('supplier_code_exists');
    }

    const row = await this.prisma.suppliers.update({
      where: { id },
      data: {
        ...(dto.storeId !== undefined && { store_id: dto.storeId }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.code !== undefined && { code }),
        ...(dto.contactPerson !== undefined && {
          contact_person: clean(dto.contactPerson),
        }),
        ...(dto.phone !== undefined && { phone: clean(dto.phone) }),
        ...(dto.email !== undefined && { email: clean(dto.email) }),
        ...(dto.address !== undefined && { address: clean(dto.address) }),
        ...(dto.taxNumber !== undefined && { tax_number: clean(dto.taxNumber) }),
        ...(dto.notes !== undefined && { notes: clean(dto.notes) }),
        ...(dto.isActive !== undefined && { is_active: dto.isActive }),
        updated_at: new Date().toISOString(),
      },
    });
    return this.normalize(row);
  }

  async deactivate(id: number) {
    return this.update(id, { isActive: false });
  }
}
