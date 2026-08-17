// apps/api/src/modules/cashflow/cashflow.dto.ts
//
// Real class-validator DTOs for cashflow/register session writes. Previously
// these were plain TS interfaces, which the global AppValidationPipe silently
// skips (it only validates class-typed bodies) — so these endpoints ran with
// no request validation at all.
//
// `storeId` was previously an (untrusted) optional field on these DTOs —
// it's no longer accepted here at all (SEC-06): the store now always comes
// from the authenticated request via @StoreId(), never from client input.

import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CashflowEntryType, CashflowEntryTypeValue } from '@libs/contracts/src/enums';

export class OpenSessionDto {
  @IsString()
  cashierId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingCash?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseSessionDto {
  @IsInt()
  sessionId!: number;

  @IsNumber()
  @Min(0)
  countedCash!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  operatorId!: string;
}

const ADJUSTMENT_TYPES = ['cash_in', 'cash_out', 'expense', 'refund'] as const;
export type CashAdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export class CashAdjustmentDto {
  @IsIn(ADJUSTMENT_TYPES)
  adjustmentType!: CashAdjustmentType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  // Optional here (unlike RecordEntryDto) — the controller falls back to the
  // authenticated user's actor id when the client omits this.
  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class RecordEntryDto {
  @IsIn(Object.values(CashflowEntryType))
  entryType!: CashflowEntryTypeValue;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  operatorId!: string;

  @IsOptional()
  @IsInt()
  sessionId?: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
