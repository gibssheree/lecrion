import {
  BusinessVertical,
  PlatformModule,
  StoreVerificationStatus,
} from '@libs/contracts/src/modules';
import { StoresService } from './stores.service';

type PrismaMock = {
  store_settings: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  $queryRawUnsafe: jest.Mock;
  $executeRawUnsafe: jest.Mock;
};

function createPrismaMock(settings: Record<string, string> = {}): PrismaMock {
  return {
    store_settings: {
      findMany: jest.fn().mockResolvedValue(
        Object.entries(settings).map(([key, value]) => ({
          key: `default-store:${key}`,
          value,
        })),
      ),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('missing table')),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };
}

describe('StoresService capabilities', () => {
  it('maps legacy restaurant businessType to restaurant_cafe F&B modules', async () => {
    const prisma = createPrismaMock({ businessType: 'restaurant' });
    const service = new StoresService(prisma as never);

    const capabilities = await service.getCapabilities('default-store');

    expect(capabilities.businessVertical).toBe(
      BusinessVertical.RESTAURANT_CAFE,
    );
    expect(capabilities.enabledModules).toContain(PlatformModule.FNB_KDS);
    expect(capabilities.enabledModules).toContain(PlatformModule.FNB_TABLES);
    expect(capabilities.verificationStatus).toBe(
      StoreVerificationStatus.VERIFIED,
    );
  });

  it('keeps non-F&B stores off F&B modules when using compatibility fallback', async () => {
    const prisma = createPrismaMock({ businessType: 'retail' });
    const service = new StoresService(prisma as never);

    const capabilities = await service.getCapabilities('default-store');

    expect(capabilities.businessVertical).toBe(BusinessVertical.RETAIL);
    expect(capabilities.enabledModules).toContain(PlatformModule.RETAIL_BARCODE);
    expect(capabilities.enabledModules).not.toContain(PlatformModule.FNB_KDS);
  });

  it('uses verified persistent profile over legacy settings and applies overrides', async () => {
    const prisma = createPrismaMock({ businessType: 'retail' });
    prisma.$queryRawUnsafe.mockImplementation((sql: string) => {
      if (sql.includes('FROM store_business_profiles')) {
        return Promise.resolve([
          {
            store_id: 'default-store',
            requested_business_vertical: null,
            verified_business_vertical: BusinessVertical.RESTAURANT_CAFE,
            verification_status: StoreVerificationStatus.VERIFIED,
          },
        ]);
      }
      if (sql.includes('FROM platform_modules') && sql.includes('is_core')) {
        return Promise.resolve([]);
      }
      if (sql.includes('FROM business_vertical_modules')) {
        return Promise.resolve([]);
      }
      if (sql.includes('FROM store_module_overrides')) {
        return Promise.resolve([
          { module_key: PlatformModule.FNB_KDS, enabled: 0 },
        ]);
      }
      return Promise.reject(new Error(`Unexpected query: ${sql}`));
    });
    const service = new StoresService(prisma as never);

    const capabilities = await service.getCapabilities('default-store');

    expect(capabilities.businessVertical).toBe(
      BusinessVertical.RESTAURANT_CAFE,
    );
    expect(capabilities.verticalModules).toContain(PlatformModule.FNB_KDS);
    expect(capabilities.enabledModules).not.toContain(PlatformModule.FNB_KDS);
    expect(capabilities.enabledModules).toContain(PlatformModule.FNB_TABLES);
  });

  it('stores business vertical requests as pending profile changes', async () => {
    const prisma = createPrismaMock();
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          store_id: 'default-store',
          requested_business_vertical: BusinessVertical.WAREHOUSE_LOGISTICS,
          verified_business_vertical: BusinessVertical.GENERAL,
          verification_status: StoreVerificationStatus.PENDING,
          notes: 'Requested by owner@example.test',
        },
      ]);
    const service = new StoresService(prisma as never);

    const profile = await service.requestBusinessVertical({
      storeId: 'default-store',
      requestedBusinessVertical: BusinessVertical.WAREHOUSE_LOGISTICS,
      actor: 'owner@example.test',
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO store_business_profiles'),
      'default-store',
      BusinessVertical.WAREHOUSE_LOGISTICS,
      BusinessVertical.GENERAL,
      StoreVerificationStatus.PENDING,
      'Requested by owner@example.test',
      expect.any(String),
      expect.any(String),
    );
    expect(profile).toMatchObject({
      requestedBusinessVertical: BusinessVertical.WAREHOUSE_LOGISTICS,
      verifiedBusinessVertical: BusinessVertical.GENERAL,
      verificationStatus: StoreVerificationStatus.PENDING,
    });
  });
});
