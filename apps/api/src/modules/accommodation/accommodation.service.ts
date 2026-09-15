import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import {
  CheckInDto,
  CreateReservationDto,
  CreateRoomDto,
  CreateRoomTypeDto,
  UpdateRoomDto,
  UpdateRoomTypeDto,
  PostChargeDto,
  PostFolioPaymentDto,
  ROOM_STATUSES,
  RoomStatus,
} from './accommodation.types';

const ACTIVE_RESERVATION_STATUSES = ['tentative', 'confirmed', 'checked_in'];

function now() {
  return new Date().toISOString();
}

function dateOnly(value: string, field: string): string {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be an ISO date (YYYY-MM-DD)`);
  }
  return value.slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86400000);
}

@Injectable()
export class AccommodationService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoomTypes(storeId = 'default-store', includeInactive = false) {
    return this.prisma.accommodation_room_types.findMany({
      where: {
        store_id: storeId,
        ...(includeInactive ? {} : { is_active: true }),
      },
      include: { _count: { select: { rooms: true } } },
      orderBy: [{ code: 'asc' }],
    });
  }

  async createRoomType(dto: CreateRoomTypeDto) {
    const storeId = dto.storeId ?? 'default-store';
    if (!dto.code?.trim() || !dto.name?.trim()) {
      throw new BadRequestException('code and name are required');
    }
    if ((dto.baseRate ?? 0) < 0 || (dto.capacity ?? 2) < 1) {
      throw new BadRequestException(
        'baseRate must be non-negative and capacity must be positive',
      );
    }
    try {
      return await this.prisma.accommodation_room_types.create({
        data: {
          store_id: storeId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          capacity: dto.capacity ?? 2,
          base_rate: dto.baseRate ?? 0,
          updated_at: now(),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new ConflictException('Room type code already exists');
      throw error;
    }
  }

  async updateRoomType(id: number, dto: UpdateRoomTypeDto, storeId = 'default-store') {
    const existing = await this.prisma.accommodation_room_types.findFirst({ where: { id, store_id: storeId } });
    if (!existing) throw new NotFoundException('Room type not found');
    if (dto.capacity !== undefined && dto.capacity < 1) throw new BadRequestException('capacity must be positive');
    if (dto.baseRate !== undefined && dto.baseRate < 0) throw new BadRequestException('baseRate must be non-negative');
    try {
      return await this.prisma.accommodation_room_types.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.description !== undefined && { description: dto.description.trim() || null }),
          ...(dto.capacity !== undefined && { capacity: dto.capacity }),
          ...(dto.baseRate !== undefined && { base_rate: dto.baseRate }),
          ...(dto.isActive !== undefined && { is_active: dto.isActive }),
          updated_at: now(),
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Room type code already exists');
      throw error;
    }
  }

  async listRooms(storeId = 'default-store', status?: string) {
    return this.prisma.accommodation_rooms.findMany({
      where: {
        store_id: storeId,
        is_active: true,
        ...(status ? { status } : {}),
      },
      include: { room_type: true },
      orderBy: [{ floor: 'asc' }, { room_number: 'asc' }],
    });
  }

  async createRoom(dto: CreateRoomDto) {
    const storeId = dto.storeId ?? 'default-store';
    const roomType = await this.prisma.accommodation_room_types.findFirst({
      where: { id: dto.roomTypeId, store_id: storeId, is_active: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
    try {
      return await this.prisma.accommodation_rooms.create({
        data: {
          store_id: storeId,
          room_type_id: dto.roomTypeId,
          room_number: dto.roomNumber.trim(),
          floor: dto.floor?.trim() || null,
          notes: dto.notes?.trim() || null,
          updated_at: now(),
        },
        include: { room_type: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new ConflictException('Room number already exists');
      throw error;
    }
  }

  async updateRoom(id: number, dto: UpdateRoomDto, storeId = 'default-store') {
    const existing = await this.prisma.accommodation_rooms.findFirst({ where: { id, store_id: storeId } });
    if (!existing) throw new NotFoundException('Room not found');
    if (dto.roomTypeId !== undefined) {
      const type = await this.prisma.accommodation_room_types.findFirst({ where: { id: dto.roomTypeId, store_id: storeId, is_active: true } });
      if (!type) throw new NotFoundException('Room type not found');
    }
    try {
      return await this.prisma.accommodation_rooms.update({
        where: { id },
        data: {
          ...(dto.roomTypeId !== undefined && { room_type_id: dto.roomTypeId }),
          ...(dto.roomNumber !== undefined && { room_number: dto.roomNumber.trim() }),
          ...(dto.floor !== undefined && { floor: dto.floor.trim() || null }),
          ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
          ...(dto.isActive !== undefined && { is_active: dto.isActive }),
          updated_at: now(),
        },
        include: { room_type: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Room number already exists');
      throw error;
    }
  }

  async setRoomStatus(id: number, status: string, storeId = 'default-store') {
    if (!ROOM_STATUSES.includes(status as RoomStatus)) {
      throw new BadRequestException(`Invalid room status: ${status}`);
    }
    const room = await this.prisma.accommodation_rooms.findFirst({
      where: { id, store_id: storeId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (status === 'vacant') {
      const activeStay = await this.prisma.accommodation_stays.findFirst({
        where: { room_id: id, store_id: storeId, status: 'checked_in' },
      });
      if (activeStay) throw new ConflictException('Room has an active stay');
    }
    return this.prisma.accommodation_rooms.update({
      where: { id },
      data: { status, updated_at: now() },
      include: { room_type: true },
    });
  }

  async availability(
    storeId: string,
    roomTypeId: number,
    checkInDate: string,
    checkOutDate: string,
  ) {
    const checkIn = dateOnly(checkInDate, 'checkInDate');
    const checkOut = dateOnly(checkOutDate, 'checkOutDate');
    this.validateDateRange(checkIn, checkOut);
    const rooms = await this.prisma.accommodation_rooms.findMany({
      where: { store_id: storeId, room_type_id: roomTypeId, is_active: true },
      include: { room_type: true },
      orderBy: { room_number: 'asc' },
    });
    const reservations = await this.prisma.accommodation_reservations.findMany({
      where: {
        store_id: storeId,
        room_type_id: roomTypeId,
        status: { in: ACTIVE_RESERVATION_STATUSES },
        check_in_date: { lt: checkOut },
        check_out_date: { gt: checkIn },
      },
      select: { room_id: true },
    });
    const reservedRoomIds = new Set(
      reservations
        .map((row) => row.room_id)
        .filter((id): id is number => id !== null),
    );
    return {
      checkInDate: checkIn,
      checkOutDate: checkOut,
      rooms: rooms.map((room) => ({
        ...room,
        available:
          room.status !== 'out_of_order' &&
          room.status !== 'blocked' &&
          !reservedRoomIds.has(room.id),
      })),
    };
  }

  async listReservations(storeId = 'default-store', status?: string) {
    return this.prisma.accommodation_reservations.findMany({
      where: { store_id: storeId, ...(status ? { status } : {}) },
      include: {
        room_type: true,
        room: true,
        customer: true,
        guests: true,
        stays: true,
      },
      orderBy: [{ check_in_date: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createReservation(dto: CreateReservationDto) {
    const storeId = dto.storeId ?? 'default-store';
    const checkIn = dateOnly(dto.checkInDate, 'checkInDate');
    const checkOut = dateOnly(dto.checkOutDate, 'checkOutDate');
    this.validateDateRange(checkIn, checkOut);
    if (
      (dto.adults ?? 1) < 1 ||
      (dto.children ?? 0) < 0 ||
      (dto.rate ?? 0) < 0
    ) {
      throw new BadRequestException('Invalid guest count or rate');
    }

    const roomType = await this.prisma.accommodation_room_types.findFirst({
      where: { id: dto.roomTypeId, store_id: storeId, is_active: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');
    if (dto.customerId) {
      const customer = await this.prisma.customers.findFirst({
        where: { id: dto.customerId, store_id: storeId, is_active: true },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }
    if (dto.roomId)
      await this.assertRoomAssignable(
        storeId,
        dto.roomId,
        dto.roomTypeId,
        checkIn,
        checkOut,
      );

    const reservationNumber = await this.nextNumber('RSV', storeId);
    const created = await this.prisma.accommodation_reservations.create({
      data: {
        store_id: storeId,
        reservation_number: reservationNumber,
        status: 'confirmed',
        customer_id: dto.customerId ?? null,
        room_type_id: dto.roomTypeId,
        room_id: dto.roomId ?? null,
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults: dto.adults ?? 1,
        children: dto.children ?? 0,
        source: dto.source?.trim() || 'direct',
        rate: dto.rate ?? roomType.base_rate,
        deposit_amount: dto.depositAmount ?? 0,
        notes: dto.notes?.trim() || null,
        created_by: dto.createdBy ?? null,
        updated_at: now(),
        guests: dto.guests?.length
          ? {
              create: dto.guests.map((guest, index) => ({
                ...guest,
                is_primary: guest.isPrimary ?? index === 0,
              })),
            }
          : undefined,
      },
      include: { room_type: true, room: true, customer: true, guests: true },
    });
    if (created.room_id) {
      await this.prisma.accommodation_rooms.update({
        where: { id: created.room_id },
        data: { status: 'reserved', updated_at: now() },
      });
    }
    return created;
  }

  async assignRoom(id: number, roomId: number, storeId = 'default-store') {
    const reservation = await this.prisma.accommodation_reservations.findFirst({
      where: { id, store_id: storeId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status))
      throw new BadRequestException('Reservation is not assignable');
    await this.assertRoomAssignable(
      storeId,
      roomId,
      reservation.room_type_id,
      reservation.check_in_date,
      reservation.check_out_date,
      id,
    );
    return this.prisma.$transaction(async (tx) => {
      if (reservation.room_id && reservation.room_id !== roomId) {
        await tx.accommodation_rooms.update({
          where: { id: reservation.room_id },
          data: { status: 'vacant', updated_at: now() },
        });
      }
      await tx.accommodation_rooms.update({
        where: { id: roomId },
        data: { status: 'reserved', updated_at: now() },
      });
      return tx.accommodation_reservations.update({
        where: { id },
        data: { room_id: roomId, updated_at: now() },
        include: { room_type: true, room: true, guests: true },
      });
    });
  }

  async checkIn(dto: CheckInDto) {
    const storeId = dto.storeId ?? 'default-store';
    const reservation = await this.prisma.accommodation_reservations.findFirst({
      where: { id: dto.reservationId, store_id: storeId },
      include: { room_type: true, customer: true, guests: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (!['confirmed', 'tentative'].includes(reservation.status))
      throw new BadRequestException(`Reservation is ${reservation.status}`);
    const roomId = dto.roomId ?? reservation.room_id;
    if (!roomId)
      throw new BadRequestException('A room must be assigned before check-in');
    await this.assertRoomAssignable(
      storeId,
      roomId,
      reservation.room_type_id,
      reservation.check_in_date,
      reservation.check_out_date,
      reservation.id,
      true,
    );

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.accommodation_rooms.findFirst({
        where: { id: roomId, store_id: storeId },
      });
      if (
        !room ||
        ['occupied', 'out_of_order', 'blocked'].includes(room.status)
      )
        throw new ConflictException('Room is not available');
      const checkedInAt = now();
      const guestName =
        dto.guestName?.trim() ||
        reservation.guests.find((guest) => guest.is_primary)?.name ||
        reservation.customer?.name ||
        'Walk-in guest';
      const stay = await tx.accommodation_stays.create({
        data: {
          store_id: storeId,
          reservation_id: reservation.id,
          room_id: roomId,
          primary_guest_name: guestName,
          status: 'checked_in',
          actual_check_in_at: checkedInAt,
          expected_check_out: reservation.check_out_date,
          notes: dto.notes?.trim() || null,
          checked_in_by: dto.checkedInBy ?? null,
          updated_at: checkedInAt,
        },
      });
      const nights = nightsBetween(
        reservation.check_in_date,
        reservation.check_out_date,
      );
      const roomTotal = reservation.rate * nights;
      const folio = await tx.accommodation_folios.create({
        data: {
          store_id: storeId,
          folio_number: await this.nextNumber('FOL', storeId, tx),
          reservation_id: reservation.id,
          stay_id: stay.id,
          customer_id: reservation.customer_id,
          subtotal: roomTotal,
          total: roomTotal,
          balance_due: roomTotal,
          updated_at: checkedInAt,
          items: {
            create: {
              source_type: 'room_charge',
              source_id: String(roomId),
              description: `Room ${room.room_number} x ${nights} night(s)`,
              quantity: nights,
              unit_price: reservation.rate,
              total: roomTotal,
              posted_by: dto.checkedInBy ?? null,
            },
          },
        },
        include: { items: true, stay: true },
      });
      await tx.accommodation_rooms.update({
        where: { id: roomId },
        data: { status: 'occupied', updated_at: checkedInAt },
      });
      await tx.accommodation_reservations.update({
        where: { id: reservation.id },
        data: {
          room_id: roomId,
          status: 'checked_in',
          updated_at: checkedInAt,
        },
      });
      return { stay, folio };
    });
  }

  async getStay(id: number, storeId = 'default-store') {
    const stay = await this.prisma.accommodation_stays.findFirst({
      where: { id, store_id: storeId },
      include: {
        room: { include: { room_type: true } },
        reservation: { include: { customer: true, guests: true } },
        folios: { include: { items: true } },
      },
    });
    if (!stay) throw new NotFoundException('Stay not found');
    return stay;
  }

  async postCharge(
    folioId: number,
    dto: PostChargeDto,
    storeId = 'default-store',
  ) {
    if (!dto.description?.trim() || dto.quantity === 0 || dto.unitPrice < 0)
      throw new BadRequestException('Invalid folio charge');
    const folio = await this.prisma.accommodation_folios.findFirst({
      where: { id: folioId, store_id: storeId },
    });
    if (!folio) throw new NotFoundException('Folio not found');
    if (folio.status !== 'open')
      throw new BadRequestException('Folio is not open');
    const quantity = dto.quantity ?? 1;
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = Math.max(0, quantity * dto.unitPrice - discount + tax);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.accommodation_folio_items.create({
        data: {
          folio_id: folioId,
          source_type: dto.sourceType,
          source_id: dto.sourceId ?? null,
          description: dto.description.trim(),
          quantity,
          unit_price: dto.unitPrice,
          discount,
          tax,
          total,
          posted_by: dto.postedBy ?? null,
        },
      });
      const updated = await this.recalculateFolio(folioId, tx);
      return { item, folio: updated };
    });
  }

  async postPayment(
    folioId: number,
    dto: PostFolioPaymentDto,
    storeId = 'default-store',
  ) {
    if (dto.amount <= 0)
      throw new BadRequestException('Payment amount must be positive');
    const folio = await this.prisma.accommodation_folios.findFirst({
      where: { id: folioId, store_id: storeId },
    });
    if (!folio) throw new NotFoundException('Folio not found');
    if (folio.status !== 'open')
      throw new BadRequestException('Folio is not open');
    const session = await this.prisma.cash_register_sessions.findFirst({
      where: { id: dto.registerSessionId, store_id: storeId, status: 'open' },
    });
    if (!session)
      throw new BadRequestException('Open register session is required');
    if (dto.amount > folio.balance_due)
      throw new BadRequestException('Payment exceeds folio balance');
    const operatorId = dto.operatorId ?? 'front-office';
    return this.prisma.$transaction(async (tx) => {
      const paidAmount = Math.min(folio.balance_due, dto.amount);
      const updated = await tx.accommodation_folios.update({
        where: { id: folioId },
        data: {
          paid_amount: { increment: paidAmount },
          balance_due: { decrement: paidAmount },
          updated_at: now(),
        },
        include: { items: true },
      });
      await tx.cashflow_entries.create({
        data: {
          session_id: dto.registerSessionId,
          store_id: storeId,
          entry_type: 'income',
          amount: paidAmount,
          payment_method: dto.paymentMethod,
          reference_type: 'accommodation_folio',
          reference_id: String(folioId),
          category: 'hotel',
          operator_id: operatorId,
        },
      });
      return updated;
    });
  }

  async checkOut(
    stayId: number,
    storeId = 'default-store',
    checkedOutBy?: string,
  ) {
    const stay = await this.prisma.accommodation_stays.findFirst({
      where: { id: stayId, store_id: storeId },
      include: { folios: true },
    });
    if (!stay) throw new NotFoundException('Stay not found');
    if (stay.status !== 'checked_in')
      throw new BadRequestException(`Stay is ${stay.status}`);
    const folio = stay.folios.find((item) => item.status === 'open');
    if (folio && folio.balance_due > 0.005)
      throw new BadRequestException(
        `Folio has unpaid balance: ${folio.balance_due}`,
      );
    const timestamp = now();
    return this.prisma.$transaction(async (tx) => {
      const updatedStay = await tx.accommodation_stays.update({
        where: { id: stayId },
        data: {
          status: 'checked_out',
          actual_check_out_at: timestamp,
          checked_out_by: checkedOutBy ?? null,
          updated_at: timestamp,
        },
      });
      if (folio)
        await tx.accommodation_folios.update({
          where: { id: folio.id },
          data: { status: 'settled', updated_at: timestamp },
        });
      await tx.accommodation_rooms.update({
        where: { id: stay.room_id },
        data: { status: 'dirty', updated_at: timestamp },
      });
      const task = await tx.accommodation_housekeeping_tasks.create({
        data: {
          store_id: storeId,
          room_id: stay.room_id,
          task_type: 'cleaning',
          status: 'pending',
          priority: 'high',
          created_by: checkedOutBy ?? null,
        },
      });
      await tx.accommodation_reservations.updateMany({
        where: { id: stay.reservation_id ?? -1, store_id: storeId },
        data: { status: 'checked_out', updated_at: timestamp },
      });
      return { stay: updatedStay, housekeepingTask: task };
    });
  }

  async listFolios(storeId = 'default-store', status?: string) {
    return this.prisma.accommodation_folios.findMany({
      where: { store_id: storeId, ...(status ? { status } : {}) },
      include: {
        stay: { include: { room: true } },
        reservation: true,
        customer: true,
        items: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listHousekeeping(storeId = 'default-store', status?: string) {
    return this.prisma.accommodation_housekeeping_tasks.findMany({
      where: { store_id: storeId, ...(status ? { status } : {}) },
      include: { room: { include: { room_type: true } } },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
    });
  }

  async updateHousekeeping(
    id: number,
    status: string,
    storeId = 'default-store',
    assignedTo?: string,
  ) {
    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status))
      throw new BadRequestException(`Invalid housekeeping status: ${status}`);
    const task = await this.prisma.accommodation_housekeeping_tasks.findFirst({
      where: { id, store_id: storeId },
    });
    if (!task) throw new NotFoundException('Housekeeping task not found');
    const timestamp = now();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.accommodation_housekeeping_tasks.update({
        where: { id },
        data: {
          status,
          assigned_to: assignedTo ?? task.assigned_to,
          started_at:
            status === 'in_progress'
              ? (task.started_at ?? timestamp)
              : task.started_at,
          completed_at: status === 'completed' ? timestamp : task.completed_at,
          updated_at: timestamp,
        },
        include: { room: true },
      });
      if (status === 'completed')
        await tx.accommodation_rooms.update({
          where: { id: task.room_id },
          data: { status: 'clean', updated_at: timestamp },
        });
      return updated;
    });
  }

  private validateDateRange(checkIn: string, checkOut: string) {
    if (nightsBetween(checkIn, checkOut) < 1)
      throw new BadRequestException('checkOutDate must be after checkInDate');
  }

  private async assertRoomAssignable(
    storeId: string,
    roomId: number,
    roomTypeId: number,
    checkIn: string,
    checkOut: string,
    excludeReservationId?: number,
    forCheckIn = false,
  ) {
    const room = await this.prisma.accommodation_rooms.findFirst({
      where: {
        id: roomId,
        store_id: storeId,
        room_type_id: roomTypeId,
        is_active: true,
      },
    });
    if (!room)
      throw new BadRequestException(
        'Room does not belong to this store or room type',
      );
    if (
      ['out_of_order', 'blocked'].includes(room.status) ||
      (!forCheckIn && room.status === 'occupied')
    )
      throw new ConflictException('Room is not available');
    const conflict = await this.prisma.accommodation_reservations.findFirst({
      where: {
        store_id: storeId,
        room_id: roomId,
        status: { in: ACTIVE_RESERVATION_STATUSES },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        check_in_date: { lt: checkOut },
        check_out_date: { gt: checkIn },
      },
    });
    if (conflict)
      throw new ConflictException(
        `Room is already reserved: ${conflict.reservation_number}`,
      );
  }

  private async nextNumber(
    prefix: string,
    storeId: string,
    tx: any = this.prisma,
  ): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count =
      prefix === 'RSV'
        ? await tx.accommodation_reservations.count({
            where: { store_id: storeId },
          })
        : await tx.accommodation_folios.count({ where: { store_id: storeId } });
    return `${prefix}-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  private async recalculateFolio(folioId: number, tx: any = this.prisma) {
    const items = await tx.accommodation_folio_items.findMany({
      where: { folio_id: folioId },
    });
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unit_price,
      0,
    );
    const discount = items.reduce(
      (sum: number, item: any) => sum + item.discount,
      0,
    );
    const tax = items.reduce((sum: number, item: any) => sum + item.tax, 0);
    const total = Math.max(0, subtotal - discount + tax);
    const current = await tx.accommodation_folios.findUnique({
      where: { id: folioId },
    });
    const paidAmount = current?.paid_amount ?? 0;
    return tx.accommodation_folios.update({
      where: { id: folioId },
      data: {
        subtotal,
        discount,
        tax,
        total,
        balance_due: Math.max(0, total - paidAmount),
        updated_at: now(),
      },
      include: { items: true },
    });
  }
}
