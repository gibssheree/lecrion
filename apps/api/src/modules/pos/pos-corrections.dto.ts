// apps/api/src/modules/pos/pos-corrections.dto.ts
//
// DTOs and response shapes for Phase 5 correction flows:
//   void, partial/full refund, return-items
//
// ── Refund policy ─────────────────────────────────────────────────────────────
//   Refund is item-line based. Each line specifies productId + refundQty.
//   Refund amount = sum(refundQty × unitPrice) for selected lines.
//   Cannot refund more than (paid total − already refunded).
//   Status becomes PARTIALLY_REFUNDED if remaining refundable > 0, else REFUNDED.
//   Cash portion of refund creates cashflow REFUND entries.
//   Non-cash portion updates payment status only — no cash drawer movement.
//
// ── Return policy ─────────────────────────────────────────────────────────────
//   Return is independent of refund. It only restores stock.
//   returnQty cannot exceed soldQty − alreadyReturnedQty per product.
//   Return is linked to a pos_corrections document.
//   Return can exist without refund; refund can exist without return.

import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Void ──────────────────────────────────────────────────────────────────────

export class VoidOrderDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  /**
   * Manager PIN — required when approval policy triggers.
   * If the order is within the void age window, PIN is not required.
   * If the order is older than VOID_MAX_AGE_MINUTES, PIN is required.
   */
  @IsOptional()
  @IsString()
  @MinLength(4)
  managerPin?: string;

  /** Manager identifier — required when managerPin is provided */
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  managerApprovalId?: number;
}

export interface VoidOrderResponse {
  orderId: number;
  status: string;
  reason: string;
  voidedAt: string;
  correctionNumber: string;
}

// ── Refund ────────────────────────────────────────────────────────────────────

export class RefundLineDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  refundQty!: number;
}

export class RefundOrderDto {
  /**
   * Item lines to refund. Each line specifies productId + refundQty.
   * Refund amount is computed from order_items unit prices.
   * If omitted or empty, a full refund of all remaining refundable items is performed.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundLineDto)
  items?: RefundLineDto[];

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  /**
   * Manager PIN — required when refund amount exceeds REFUND_APPROVAL_THRESHOLD_IDR.
   */
  @IsOptional()
  @IsString()
  @MinLength(4)
  managerPin?: string;

  /** Manager identifier — required when managerPin is provided */
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  managerApprovalId?: number;
}

export interface RefundPaymentAllocation {
  paymentId: number;
  method: string;
  refundAmount: number;
  isCash: boolean;
  cashflowEntryId: number | null;
}

export interface RefundOrderResponse {
  orderId: number;
  /** 'refunded' or 'partially_refunded' */
  status: string;
  reason: string;
  refundedAt: string;
  correctionNumber: string;
  /** Total amount refunded in this operation */
  refundAmount: number;
  /** Total already refunded before this operation */
  previouslyRefunded: number;
  /** Remaining refundable amount after this operation */
  remainingRefundable: number;
  /** Per-payment allocation of this refund */
  paymentAllocations: RefundPaymentAllocation[];
  /** Number of cashflow counter-entries created */
  cashflowEntriesCreated: number;
  /** Lines that were refunded */
  refundedLines: Array<{
    productId: number;
    name: string;
    refundQty: number;
    unitPrice: number;
    lineRefundAmount: number;
  }>;
}

// ── Return items ──────────────────────────────────────────────────────────────

export class ReturnItemDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsInt()
  @Min(1)
  returnQty!: number;
}

export class ReturnItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  operatorId?: string;
}

export interface ReturnedItem {
  productId: number;
  name: string;
  returnQty: number;
  stockBefore: number;
  stockAfter: number;
}

export interface ReturnItemsResponse {
  orderId: number;
  reason: string;
  returnedAt: string;
  correctionNumber: string;
  returnedItems: ReturnedItem[];
}
