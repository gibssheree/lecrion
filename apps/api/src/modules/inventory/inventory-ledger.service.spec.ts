// apps/api/src/modules/inventory/inventory-ledger.service.spec.ts
//
// Unit tests for InventoryLedgerService (Phase 6J — location-aware).
// Uses in-memory mocks — no real DB required.

import { Test, TestingModule } from '@nestjs/testing';
import { InventoryLedgerService } from './inventory-ledger.service';
import { InventoryLocationService } from './inventory-location.service';
import { PrismaService } from '@libs/db/src/prisma';
import { StockMovementType } from '@libs/contracts/src/enums';

// ── Prisma mock factory ───────────────────────────────────────────────────────

function makePrismaMock(initialStock = 10) {
  let currentStock = initialStock;
  let logIdSeq = 1;
  let balanceIdSeq = 1;
  const logs: any[] = [];
  const balances: Map<string, any> = new Map();

  return {
    menu: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ stock: currentStock })),
      update: jest.fn().mockImplementation(({ data }: any) => {
        if (data.stock !== undefined) currentStock = data.stock;
        return Promise.resolve({ stock: currentStock });
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    stock_change_logs: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const row = { id: logIdSeq++, ...data };
        logs.push(row);
        return Promise.resolve(row);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(logs)),
      count: jest.fn().mockImplementation(() => Promise.resolve(logs.length)),
    },
    inventory_stock_balances: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const key = `${where.menu_id_location_id.menu_id}:${where.menu_id_location_id.location_id}`;
        return Promise.resolve(balances.get(key) ?? null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const row = { id: balanceIdSeq++, ...data };
        const key = `${data.menu_id}:${data.location_id}`;
        balances.set(key, row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const key = `${where.menu_id_location_id.menu_id}:${where.menu_id_location_id.location_id}`;
        const existing = balances.get(key);
        const updated = { ...existing, ...data };
        balances.set(key, updated);
        return Promise.resolve(updated);
      }),
      findMany: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Array.from(balances.values())),
        ),
    },
    _currentStock: () => currentStock,
    _logs: () => logs,
    _balances: () => balances,
  };
}

// ── Location service mock ─────────────────────────────────────────────────────

function makeLocationServiceMock(defaultLocationId = 1) {
  return {
    ensureDefaultLocation: jest.fn().mockResolvedValue({
      id: defaultLocationId,
      storeId: 'store-1',
      name: 'Gudang Utama',
      type: 'warehouse',
      isDefault: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InventoryLedgerService', () => {
  let service: InventoryLedgerService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let locationMock: ReturnType<typeof makeLocationServiceMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock(10);
    locationMock = makeLocationServiceMock(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryLedgerService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InventoryLocationService, useValue: locationMock },
      ],
    }).compile();

    service = module.get<InventoryLedgerService>(InventoryLedgerService);
  });

  // ── writeMovement — legacy behaviour ──────────────────────────────────────

  describe('writeMovement — legacy (no location)', () => {
    it('decrements menu.stock and writes a SALE movement log', async () => {
      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -3,
        movementType: StockMovementType.SALE,
        note: 'POS sale abc123',
        operatorId: 'cashier-1',
        storeId: 'store-1',
        orderId: 42,
        locationId: null, // explicit legacy mode
      });

      expect(result.qtyBefore).toBe(10);
      expect(result.qtyChange).toBe(-3);
      expect(result.qtyAfter).toBe(7);
      expect(result.changeType).toBe(StockMovementType.SALE);
      expect(result.operatorId).toBe('cashier-1');
      expect(result.storeId).toBe('store-1');
      expect(result.orderId).toBe(42);
      expect(result.locationId).toBeNull();

      expect(prismaMock.menu.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { stock: 7 } }),
      );
      // No balance upsert in legacy mode
      expect(prismaMock.inventory_stock_balances.create).not.toHaveBeenCalled();
      expect(prismaMock.inventory_stock_balances.update).not.toHaveBeenCalled();
    });

    it('increments menu.stock for a RESTOCK movement', async () => {
      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: 20,
        movementType: StockMovementType.RESTOCK,
        note: 'Supplier delivery',
        operatorId: 'owner',
        locationId: null,
      });

      expect(result.qtyBefore).toBe(10);
      expect(result.qtyAfter).toBe(30);
      expect(result.changeType).toBe(StockMovementType.RESTOCK);
    });

    it('uses default-store when storeId is omitted', async () => {
      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -1,
        movementType: StockMovementType.WASTE,
        locationId: null,
      });

      expect(result.storeId).toBe('default-store');
    });

    it('throws when product is not found', async () => {
      prismaMock.menu.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.writeMovement({
          menuId: 999,
          qtyChange: -1,
          movementType: StockMovementType.SALE,
          locationId: null,
        }),
      ).rejects.toThrow('Product #999 not found');
    });
  });

  // ── writeMovement — location-aware ────────────────────────────────────────

  describe('writeMovement — location-aware', () => {
    it('creates a new balance row on first write for a location', async () => {
      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -2,
        movementType: StockMovementType.SALE,
        storeId: 'store-1',
        locationId: 5,
        operatorId: 'cashier-1',
      });

      expect(result.locationId).toBe(5);
      expect(result.qtyAfter).toBe(8);

      // Balance should be created with initial value = qtyBefore + qtyChange = 10 - 2 = 8
      expect(prismaMock.inventory_stock_balances.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            menu_id: 1,
            location_id: 5,
            qty_on_hand: 8,
          }),
        }),
      );
    });

    it('updates existing balance row on subsequent writes', async () => {
      // Seed an existing balance
      prismaMock.inventory_stock_balances.findUnique = jest
        .fn()
        .mockResolvedValue({ qty_on_hand: 8 });

      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -3,
        movementType: StockMovementType.SALE,
        locationId: 5,
      });

      expect(result.locationId).toBe(5);
      expect(prismaMock.inventory_stock_balances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qty_on_hand: 5 }), // 8 - 3
        }),
      );
      expect(prismaMock.inventory_stock_balances.create).not.toHaveBeenCalled();
    });

    it('auto-resolves default location when locationId is undefined', async () => {
      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -1,
        movementType: StockMovementType.SALE,
        storeId: 'store-1',
        // locationId not provided → auto-resolve
      });

      expect(locationMock.ensureDefaultLocation).toHaveBeenCalledWith(
        'store-1',
        expect.anything(),
      );
      expect(result.locationId).toBe(1); // default location id from mock
    });

    it('SALE movement decrements correct location balance', async () => {
      prismaMock.inventory_stock_balances.findUnique = jest
        .fn()
        .mockResolvedValue({ qty_on_hand: 15 });

      await service.writeMovement({
        menuId: 1,
        qtyChange: -5,
        movementType: StockMovementType.SALE,
        locationId: 3,
        storeId: 'store-1',
      });

      expect(prismaMock.inventory_stock_balances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            menu_id_location_id: { menu_id: 1, location_id: 3 },
          },
          data: expect.objectContaining({ qty_on_hand: 10 }), // 15 - 5
        }),
      );
    });

    it('RETURN movement increments correct location balance', async () => {
      prismaMock.inventory_stock_balances.findUnique = jest
        .fn()
        .mockResolvedValue({ qty_on_hand: 5 });

      await service.writeMovement({
        menuId: 1,
        qtyChange: 2, // positive = stock in
        movementType: StockMovementType.RETURN,
        locationId: 3,
        storeId: 'store-1',
      });

      expect(prismaMock.inventory_stock_balances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qty_on_hand: 7 }), // 5 + 2
        }),
      );
    });

    it('ADJUSTMENT can target a specific location', async () => {
      prismaMock.inventory_stock_balances.findUnique = jest
        .fn()
        .mockResolvedValue({ qty_on_hand: 20 });

      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -10,
        movementType: StockMovementType.ADJUSTMENT,
        locationId: 7,
        note: 'Opname correction',
        operatorId: 'manager-1',
      });

      expect(result.changeType).toBe(StockMovementType.ADJUSTMENT);
      expect(result.locationId).toBe(7);
      expect(prismaMock.inventory_stock_balances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qty_on_hand: 10 }),
        }),
      );
    });

    it('RESTOCK can target a specific location', async () => {
      prismaMock.inventory_stock_balances.findUnique = jest
        .fn()
        .mockResolvedValue({ qty_on_hand: 0 });

      await service.writeMovement({
        menuId: 1,
        qtyChange: 50,
        movementType: StockMovementType.RESTOCK,
        locationId: 2,
        note: 'Supplier delivery',
      });

      expect(prismaMock.inventory_stock_balances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qty_on_hand: 50 }),
        }),
      );
    });

    it('location resolution failure falls back to legacy mode gracefully', async () => {
      locationMock.ensureDefaultLocation = jest
        .fn()
        .mockRejectedValue(new Error('DB error'));

      const result = await service.writeMovement({
        menuId: 1,
        qtyChange: -1,
        movementType: StockMovementType.SALE,
        storeId: 'store-1',
        // locationId undefined → auto-resolve → fails → legacy fallback
      });

      // Should still update menu.stock and write log
      expect(prismaMock.menu.update).toHaveBeenCalled();
      expect(prismaMock.stock_change_logs.create).toHaveBeenCalled();
      // But no balance upsert
      expect(prismaMock.inventory_stock_balances.create).not.toHaveBeenCalled();
      expect(result.locationId).toBeNull();
    });
  });

  // ── appendMovementLog ──────────────────────────────────────────────────────

  describe('appendMovementLog', () => {
    it('writes a log row without touching menu.stock', async () => {
      const result = await service.appendMovementLog({
        menuId: 1,
        qtyBefore: 10,
        qtyChange: -5,
        qtyAfter: 5,
        movementType: StockMovementType.ADJUSTMENT,
        note: 'Manual dashboard edit',
        operatorId: 'dashboard',
        sourceRef: 'dashboard-manual',
        locationId: null,
      });

      expect(result.qtyBefore).toBe(10);
      expect(result.qtyChange).toBe(-5);
      expect(result.qtyAfter).toBe(5);
      expect(result.changeType).toBe(StockMovementType.ADJUSTMENT);
      expect(result.sourceRef).toBe('dashboard-manual');

      // menu.update must NOT have been called
      expect(prismaMock.menu.update).not.toHaveBeenCalled();
    });

    it('upserts balance when locationId is provided', async () => {
      await service.appendMovementLog({
        menuId: 1,
        qtyBefore: 10,
        qtyChange: -3,
        qtyAfter: 7,
        movementType: StockMovementType.ADJUSTMENT,
        locationId: 4,
      });

      expect(prismaMock.inventory_stock_balances.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            menu_id: 1,
            location_id: 4,
            qty_on_hand: 7, // qtyBefore + qtyChange = 10 - 3 = 7
          }),
        }),
      );
    });
  });

  // ── listMovements ──────────────────────────────────────────────────────────

  describe('listMovements', () => {
    it('returns movements and total count', async () => {
      await service.appendMovementLog({
        menuId: 1,
        qtyBefore: 10,
        qtyChange: -2,
        qtyAfter: 8,
        movementType: StockMovementType.SALE,
        locationId: null,
      });
      await service.appendMovementLog({
        menuId: 1,
        qtyBefore: 8,
        qtyChange: -1,
        qtyAfter: 7,
        movementType: StockMovementType.WASTE,
        locationId: null,
      });

      const { movements, total } = await service.listMovements({ menuId: 1 });

      expect(total).toBe(2);
      expect(movements).toHaveLength(2);
    });

    it('applies default limit of 50', async () => {
      await service.listMovements({});
      expect(prismaMock.stock_change_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('caps limit at 200', async () => {
      await service.listMovements({ limit: 9999 });
      expect(prismaMock.stock_change_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('filters by locationId when provided', async () => {
      await service.listMovements({ locationId: 3 });
      expect(prismaMock.stock_change_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ location_id: 3 }),
        }),
      );
    });
  });

  // ── getStockBalances ───────────────────────────────────────────────────────

  describe('getStockBalances', () => {
    it('returns legacy fallback when no balance rows exist', async () => {
      prismaMock.inventory_stock_balances.findMany = jest
        .fn()
        .mockResolvedValue([]);

      const balances = await service.getStockBalances(1);

      expect(balances).toHaveLength(1);
      expect(balances[0].locationName).toBe('Global (legacy)');
      expect(balances[0].qtyOnHand).toBe(10); // from menu.stock mock
      expect(balances[0].legacyStock).toBe(10);
    });

    it('returns location-aware balances when rows exist', async () => {
      prismaMock.inventory_stock_balances.findMany = jest
        .fn()
        .mockResolvedValue([
          {
            menu_id: 1,
            location_id: 2,
            qty_on_hand: 7,
            qty_reserved: 0,
            updated_at: new Date().toISOString(),
            inventory_locations: {
              name: 'Gudang Utama',
              type: 'warehouse',
              is_default: true,
            },
          },
        ]);

      const balances = await service.getStockBalances(1);

      expect(balances).toHaveLength(1);
      expect(balances[0].locationName).toBe('Gudang Utama');
      expect(balances[0].qtyOnHand).toBe(7);
      expect(balances[0].isDefaultLocation).toBe(true);
    });
  });
});
