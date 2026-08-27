// apps/api/src/modules/bot/bot-routing.service.spec.ts
//
// Tests for BotRoutingService — resolving which store a WhatsApp
// conversation belongs to (SEC-11). See the bot_conversation_bindings
// model comment in schema.prisma for the design this implements.

import { BotRoutingService } from './bot-routing.service';

function makeHarness(
  options: {
    adminPhoneRows?: Array<{ key: string; value: string }>;
    bindings?: Record<string, string>;
    knownStoreIds?: string[];
    defaultStoreId?: string;
    fonnteWaNumber?: string;
  } = {},
) {
  const adminPhoneRows = options.adminPhoneRows ?? [];
  const bindings = { ...(options.bindings ?? {}) };
  const knownStoreIds = new Set(options.knownStoreIds ?? ['store-a', 'store-b']);
  const storeNames: Record<string, string> = {
    'store-a': 'Toko A',
    'store-b': 'Toko B',
  };

  const clearCart = jest.fn().mockResolvedValue(undefined);
  const clearHistory = jest.fn().mockResolvedValue(undefined);

  const prisma = {
    $queryRawUnsafe: jest.fn().mockResolvedValue(adminPhoneRows),
    stores: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(knownStoreIds.has(where.id) ? { id: where.id } : null),
      ),
    },
    bot_conversation_bindings: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(
          bindings[where.sender]
            ? { sender: where.sender, store_id: bindings[where.sender] }
            : null,
        ),
      ),
      upsert: jest.fn(({ where, create }: any) => {
        bindings[where.sender] = create.store_id;
        return Promise.resolve({});
      }),
    },
  };

  const config = {
    defaultStoreId: options.defaultStoreId ?? 'default-store',
    fonnteWaNumber: options.fonnteWaNumber ?? '',
  };

  const stores = {
    getSettings: jest.fn((storeId: string) =>
      Promise.resolve({ storeName: storeNames[storeId] ?? storeId }),
    ),
  };

  const cart = { clearCart };
  const history = { clearHistory };

  const service = new BotRoutingService(
    prisma as any,
    config as any,
    stores as any,
    cart as any,
    history as any,
  );

  return { service, prisma, bindings, clearCart, clearHistory };
}

describe('BotRoutingService.resolveConversation', () => {
  it('recognizes the owner by adminPhones, regardless of any binding', async () => {
    const { service } = makeHarness({
      adminPhoneRows: [{ key: 'store-a:adminPhones', value: '081234567890' }],
    });

    const result = await service.resolveConversation('6281234567890', 'halo');

    expect(result).toEqual({
      storeId: 'store-a',
      storeName: 'Toko A',
      isOwner: true,
      justBound: false,
    });
  });

  it('normalizes phone formats (0…, 62…, 8…) when matching adminPhones', async () => {
    const { service } = makeHarness({
      adminPhoneRows: [{ key: 'store-a:adminPhones', value: '0812-3456-7890' }],
    });

    const result = await service.resolveConversation('81234567890', 'halo');
    expect(result.isOwner).toBe(true);
    expect(result.storeId).toBe('store-a');
  });

  it('binds a new sender on a valid trigger message', async () => {
    const { service, bindings } = makeHarness();

    const result = await service.resolveConversation(
      '6289900001111',
      'LECRION:store-b',
    );

    expect(result).toEqual({
      storeId: 'store-b',
      storeName: 'Toko B',
      isOwner: false,
      justBound: true,
    });
    expect(bindings['6289900001111']).toBe('store-b');
  });

  it('ignores a trigger message referencing an unknown store, falling back cleanly', async () => {
    const { service } = makeHarness({ defaultStoreId: 'default-store' });

    const result = await service.resolveConversation(
      '6289900002222',
      'LECRION:store-does-not-exist',
    );

    expect(result.justBound).toBe(false);
    expect(result.storeId).toBe('default-store');
  });

  it('uses an existing binding for a plain message', async () => {
    const { service } = makeHarness({
      bindings: { '6289900003333': 'store-a' },
    });

    const result = await service.resolveConversation(
      '6289900003333',
      'ada kopi susu?',
    );

    expect(result).toEqual({
      storeId: 'store-a',
      storeName: 'Toko A',
      isOwner: false,
      justBound: false,
    });
  });

  it('falls back to defaultStoreId for a totally unknown sender', async () => {
    const { service } = makeHarness({ defaultStoreId: 'default-store' });

    const result = await service.resolveConversation('6289900004444', 'menu');

    expect(result.storeId).toBe('default-store');
    expect(result.isOwner).toBe(false);
    expect(result.justBound).toBe(false);
  });

  it('clears cart and history when rebinding to a DIFFERENT store', async () => {
    const { service, clearCart, clearHistory } = makeHarness({
      bindings: { '6289900005555': 'store-a' },
    });

    await service.resolveConversation('6289900005555', 'LECRION:store-b');

    expect(clearCart).toHaveBeenCalledWith('6289900005555');
    expect(clearHistory).toHaveBeenCalledWith('6289900005555');
  });

  it('does NOT clear cart/history when re-scanning the SAME store already bound', async () => {
    const { service, clearCart, clearHistory } = makeHarness({
      bindings: { '6289900006666': 'store-a' },
    });

    const result = await service.resolveConversation(
      '6289900006666',
      'LECRION:store-a',
    );

    expect(result.storeId).toBe('store-a');
    expect(clearCart).not.toHaveBeenCalled();
    expect(clearHistory).not.toHaveBeenCalled();
  });

  it('owner check takes priority over an existing customer binding', async () => {
    const { service } = makeHarness({
      adminPhoneRows: [{ key: 'store-b:adminPhones', value: '081299998888' }],
      bindings: { '6281299998888': 'store-a' },
    });

    const result = await service.resolveConversation('6281299998888', 'halo');

    expect(result.isOwner).toBe(true);
    expect(result.storeId).toBe('store-b');
  });
});

describe('BotRoutingService.buildWhatsAppLink', () => {
  it('returns null when FONNTE_WA_NUMBER is not configured', () => {
    const { service } = makeHarness({ fonnteWaNumber: '' });
    expect(service.buildWhatsAppLink('store-a')).toBeNull();
  });

  it('builds a wa.me link with the store trigger code when configured', () => {
    const { service } = makeHarness({ fonnteWaNumber: '6281111111111' });
    const link = service.buildWhatsAppLink('store-a');
    expect(link).toBe('https://wa.me/6281111111111?text=LECRION%3Astore-a');
  });
});
