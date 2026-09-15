// apps/api/src/modules/accommodation/accommodation.service.spec.ts
//
// Regression coverage for SEC-13: every accommodation endpoint (rooms,
// reservations, check-in/out, folios, housekeeping) sourced storeId from
// the client (query string or request body) instead of the authenticated
// JWT. An authenticated user at any store could read or write another
// hotel's rooms, reservations, and folio payments by passing a different
// storeId. Now the controller resolves storeId via @StoreId() and the
// service takes it as a required argument, never from the request body.

import { AccommodationService } from './accommodation.service';

function makePrisma() {
  const roomTypes = [
    { id: 1, store_id: 'hotel-a', code: 'STD', name: 'Standard', is_active: true, base_rate: 500_000 },
    { id: 2, store_id: 'hotel-b', code: 'STD', name: 'Standard', is_active: true, base_rate: 500_000 },
  ];
  const rooms = [
    { id: 10, store_id: 'hotel-a', room_type_id: 1, room_number: '101', status: 'vacant', is_active: true },
    { id: 20, store_id: 'hotel-b', room_type_id: 2, room_number: '201', status: 'vacant', is_active: true },
  ];

  return {
    accommodation_room_types: {
      findMany: jest.fn(async ({ where }: any) =>
        roomTypes.filter((r) => r.store_id === where.store_id),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        roomTypes.find(
          (r) => r.id === where.id && r.store_id === where.store_id,
        ) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => ({ id: 99, ...data })),
      count: jest.fn().mockResolvedValue(0),
    },
    accommodation_rooms: {
      findMany: jest.fn(async ({ where }: any) =>
        rooms.filter((r) => r.store_id === where.store_id),
      ),
      findFirst: jest.fn(async ({ where }: any) =>
        rooms.find(
          (r) => r.id === where.id && r.store_id === where.store_id,
        ) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    },
    accommodation_reservations: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    accommodation_stays: { findFirst: jest.fn().mockResolvedValue(null) },
    customers: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

describe('AccommodationService store scoping (SEC-13)', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AccommodationService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AccommodationService(prisma as any);
  });

  it('listRoomTypes never returns another hotel\'s room types', async () => {
    const result = await service.listRoomTypes('hotel-a');
    expect(result).toHaveLength(1);
    expect(result[0].store_id).toBe('hotel-a');
  });

  it('listRooms never returns another hotel\'s rooms', async () => {
    const result = await service.listRooms('hotel-a');
    expect(result).toHaveLength(1);
    expect(result[0].store_id).toBe('hotel-a');
  });

  it('createRoomType uses the storeId argument, not a client-supplied field on the dto', async () => {
    await service.createRoomType(
      { code: 'DLX', name: 'Deluxe' } as any,
      'hotel-a',
    );
    expect(prisma.accommodation_room_types.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ store_id: 'hotel-a' }),
      }),
    );
  });

  it('updateRoom 404s when the room belongs to a different store', async () => {
    await expect(
      service.updateRoom(20, { notes: 'hacked' } as any, 'hotel-a'),
    ).rejects.toThrow('Room not found');
  });

  it('setRoomStatus 404s when the room belongs to a different store', async () => {
    await expect(
      service.setRoomStatus(20, 'out_of_order', 'hotel-a'),
    ).rejects.toThrow('Room not found');
  });
});
