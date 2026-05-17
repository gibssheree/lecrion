// apps/api/src/modules/catalog/catalog.service.spec.ts
//
// Unit tests for CatalogService (Phase 4 generalization).
// Uses an in-memory mock of PrismaService — no real DB required.
//
// Coverage:
//   1. Existing catalog list still works (name/price/stock present)
//   2. SKU / barcode searchable via searchProducts
//   3. Service product (is_stock_tracked=false) is always available
//   4. product_type defaults safely to "simple" for old rows (missing field)
//   5. createProduct / updateProduct DTO round-trips

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';
import { PrismaService } from '@libs/db/src/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

// ProductType strings as literals to avoid module resolution issues in tests
const PT_SIMPLE = 'simple';
const PT_SERVICE = 'service';
const PT_VARIANT = 'variant';
const PT_BUNDLE = 'bundle';
const PT_MATERIAL = 'material';

function makeMenuRow(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 1,
    name: 'Test Product',
    price: 10000,
    stock: 10,
    description: null,
    image_url: null,
    sku: null,
    barcode: null,
    product_type: 'simple',
    unit_name: null,
    unit_code: null,
    brand: null,
    supplier_name: null,
    supplier_id: null,
    attributes: null,
    parent_product_id: null,
    is_stock_tracked: true,
    is_active: true,
    ...overrides,
  };
}

function filterRows(rows: any[], where: any = {}): any[] {
  let result = [...rows];
  if (where?.is_active !== undefined) {
    result = result.filter((r) => r.is_active === where.is_active);
  }
  if (where?.is_stock_tracked !== undefined) {
    result = result.filter(
      (r) => r.is_stock_tracked === where.is_stock_tracked,
    );
  }
  if (where?.OR) {
    result = result.filter((r) =>
      where.OR.some((cond: any) => {
        const [field, op] = Object.entries(cond)[0] as [string, any];
        const val = r[field];
        if (op.contains)
          return val != null && String(val).includes(op.contains);
        if (op.equals) return val === op.equals;
        return false;
      }),
    );
  }
  return result;
}

function makePrismaMock(rows: any[] = [makeMenuRow()]) {
  const store = [...rows];
  let idSeq = rows.length + 1;

  return {
    menu: {
      findMany: jest
        .fn()
        .mockImplementation(({ where }: any = {}) =>
          Promise.resolve(
            filterRows(store, where).map((r: any) => ({
              ...r,
              category: null,
            })),
          ),
        ),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const row = store.find((r) => r.id === where.id) ?? null;
        return Promise.resolve(row ? { ...row, category: null } : null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const row = { ...makeMenuRow(), id: idSeq++, ...data, category: null };
        store.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = store.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error('not found');
        store[idx] = { ...store[idx], ...data };
        return Promise.resolve({ ...store[idx], category: null });
      }),
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: store.length },
        _sum: { stock: store.reduce((s: number, r: any) => s + r.stock, 0) },
      }),
    },
    // Phase 6A: product_barcodes mock (empty by default — tests that need it
    // can override this mock on the returned object)
    product_barcodes: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    _store: store,
  };
}

// ── Helper to build a module with a given mock ────────────────────────────────

async function buildModule(mock: ReturnType<typeof makePrismaMock>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [CatalogService, { provide: PrismaService, useValue: mock }],
  }).compile();
  return module.get<CatalogService>(CatalogService);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CatalogService', () => {
  let service: CatalogService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    service = await buildModule(prismaMock);
  });

  // ── 1. Legacy catalog list ─────────────────────────────────────────────────

  describe('getAllProducts', () => {
    it('returns products with legacy core fields (name, price, stock)', async () => {
      const products = await service.getAllProducts();
      expect(products).toHaveLength(1);
      const p = products[0];
      expect(p.name).toBe('Test Product');
      expect(p.price).toBe(10000);
      expect(p.stock).toBe(10);
    });

    it('available=true when stock > 0 and is_stock_tracked=true', async () => {
      const [p] = await service.getAllProducts();
      expect(p.available).toBe(true);
    });

    it('available=false when stock=0 and is_stock_tracked=true', async () => {
      const mock2 = makePrismaMock([makeMenuRow({ stock: 0 })]);
      const svc2 = await buildModule(mock2);
      const [p] = await svc2.getAllProducts();
      expect(p.available).toBe(false);
    });
  });

  // ── 2. SKU / barcode search ────────────────────────────────────────────────

  describe('searchProducts', () => {
    let svcWithData: CatalogService;

    beforeEach(async () => {
      const mock2 = makePrismaMock([
        makeMenuRow({
          id: 1,
          name: 'Bata Merah',
          sku: 'BM-001',
          barcode: '8991234560001',
        }),
        makeMenuRow({
          id: 2,
          name: 'Semen Portland',
          sku: 'SP-100',
          barcode: '8991234560002',
        }),
        makeMenuRow({ id: 3, name: 'Cat Tembok', sku: null, barcode: null }),
      ]);
      svcWithData = await buildModule(mock2);
    });

    it('matches by SKU prefix', async () => {
      const results = await svcWithData.searchProducts('BM-001');
      expect(results.some((p) => p.sku === 'BM-001')).toBe(true);
    });

    it('matches by exact barcode', async () => {
      const results = await svcWithData.searchProducts('8991234560002');
      expect(results.some((p) => p.barcode === '8991234560002')).toBe(true);
    });

    it('matches by product name', async () => {
      const results = await svcWithData.searchProducts('Cat');
      expect(results.some((p) => p.name === 'Cat Tembok')).toBe(true);
    });
  });

  // ── 3. Service product — no stock requirement ──────────────────────────────

  describe('service product (is_stock_tracked=false)', () => {
    it('available=true even when stock=0', async () => {
      const mock2 = makePrismaMock([
        makeMenuRow({
          product_type: PT_SERVICE,
          is_stock_tracked: false,
          stock: 0,
        }),
      ]);
      const svc2 = await buildModule(mock2);
      const [p] = await svc2.getAllProducts();
      expect(p.isStockTracked).toBe(false);
      expect(p.available).toBe(true);
    });

    it('productType is "service"', async () => {
      const mock2 = makePrismaMock([
        makeMenuRow({ product_type: PT_SERVICE, is_stock_tracked: false }),
      ]);
      const svc2 = await buildModule(mock2);
      const [p] = await svc2.getAllProducts();
      expect(p.productType).toBe(PT_SERVICE);
    });
  });

  // ── 4. product_type default for legacy rows ────────────────────────────────

  describe('product_type default', () => {
    it('returns "simple" when product_type is "simple" (migration default)', async () => {
      const mock2 = makePrismaMock([makeMenuRow({ product_type: PT_SIMPLE })]);
      const svc2 = await buildModule(mock2);
      const [p] = await svc2.getAllProducts();
      expect(p.productType).toBe(PT_SIMPLE);
    });

    it('falls back to "simple" when product_type is null (pre-migration row)', async () => {
      const mock2 = makePrismaMock([makeMenuRow({ product_type: null })]);
      const svc2 = await buildModule(mock2);
      const [p] = await svc2.getAllProducts();
      expect(p.productType).toBe(PT_SIMPLE);
    });
  });

  // ── 5. createProduct / updateProduct ──────────────────────────────────────

  describe('createProduct', () => {
    it('creates a product with generalization fields', async () => {
      const p = await service.createProduct({
        name: 'Pipa PVC 1/2"',
        price: 15000,
        sku: 'PVC-050',
        barcode: '8997777000001',
        productType: PT_SIMPLE as any,
        unitName: 'batang',
        unitCode: 'pcs',
        brand: 'Rucika',
        isStockTracked: true,
        isActive: true,
      });
      expect(p.sku).toBe('PVC-050');
      expect(p.barcode).toBe('8997777000001');
      expect(p.unitName).toBe('batang');
      expect(p.brand).toBe('Rucika');
      expect(p.productType).toBe(PT_SIMPLE);
    });

    it('creates a service product with is_stock_tracked=false', async () => {
      const p = await service.createProduct({
        name: 'Jasa Pasang AC',
        price: 250000,
        productType: PT_SERVICE as any,
        isStockTracked: false,
      });
      expect(p.isStockTracked).toBe(false);
      expect(p.productType).toBe(PT_SERVICE);
      expect(p.available).toBe(true);
    });
  });

  describe('updateProduct', () => {
    it('returns null for non-existent product', async () => {
      prismaMock.menu.findUnique = jest.fn().mockResolvedValue(null);
      const result = await service.updateProduct(999, { name: 'X' });
      expect(result).toBeNull();
    });

    it('partially updates product fields', async () => {
      const result = await service.updateProduct(1, {
        brand: 'NewBrand',
        sku: 'NEW-SKU',
      });
      expect(result).not.toBeNull();
      expect(result!.brand).toBe('NewBrand');
      expect(result!.sku).toBe('NEW-SKU');
    });
  });

  // ── 6. isActive filter ────────────────────────────────────────────────────

  describe('isActive filtering', () => {
    it('excludes inactive products from default list', async () => {
      const mock2 = makePrismaMock([
        makeMenuRow({ id: 1, name: 'Active', is_active: true }),
        makeMenuRow({ id: 2, name: 'Inactive', is_active: false }),
      ]);
      const svc2 = await buildModule(mock2);
      const products = await svc2.getAllProducts(false);
      expect(products.every((p) => p.isActive)).toBe(true);
    });

    it('includes inactive products when includeInactive=true', async () => {
      const mock2 = makePrismaMock([
        makeMenuRow({ id: 1, name: 'Active', is_active: true }),
        makeMenuRow({ id: 2, name: 'Inactive', is_active: false }),
      ]);
      const svc2 = await buildModule(mock2);
      const products = await svc2.getAllProducts(true);
      expect(products.length).toBe(2);
    });
  });
});
