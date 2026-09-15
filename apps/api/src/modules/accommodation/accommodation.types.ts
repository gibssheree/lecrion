export const ROOM_STATUSES = [
  'vacant',
  'reserved',
  'occupied',
  'dirty',
  'clean',
  'inspected',
  'out_of_order',
  'blocked',
] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const RESERVATION_STATUSES = [
  'tentative',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const STAY_STATUSES = [
  'expected',
  'checked_in',
  'checked_out',
  'cancelled',
] as const;
export type StayStatus = (typeof STAY_STATUSES)[number];

export const FOLIO_STATUSES = ['open', 'settled', 'cancelled'] as const;
export type FolioStatus = (typeof FOLIO_STATUSES)[number];

export const HOUSEKEEPING_STATUSES = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type HousekeepingStatus = (typeof HOUSEKEEPING_STATUSES)[number];

export interface CreateRoomTypeDto {
  storeId?: string;
  code: string;
  name: string;
  description?: string;
  capacity?: number;
  baseRate?: number;
}

export interface CreateRoomDto {
  storeId?: string;
  roomTypeId: number;
  roomNumber: string;
  floor?: string;
  notes?: string;
}

export interface UpdateRoomTypeDto {
  code?: string;
  name?: string;
  description?: string;
  capacity?: number;
  baseRate?: number;
  isActive?: boolean;
}

export interface UpdateRoomDto {
  roomTypeId?: number;
  roomNumber?: string;
  floor?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreateReservationDto {
  storeId?: string;
  customerId?: number;
  roomTypeId: number;
  roomId?: number;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  source?: string;
  rate?: number;
  depositAmount?: number;
  notes?: string;
  createdBy?: string;
  guests?: Array<{
    name: string;
    identityType?: string;
    identityNumber?: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
  }>;
}

export interface CheckInDto {
  storeId?: string;
  reservationId: number;
  roomId?: number;
  guestName?: string;
  checkedInBy?: string;
  notes?: string;
}

export interface PostChargeDto {
  sourceType: string;
  sourceId?: string;
  description: string;
  quantity?: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  postedBy?: string;
}

export interface PostFolioPaymentDto {
  amount: number;
  paymentMethod: string;
  registerSessionId: number;
  operatorId?: string;
}
