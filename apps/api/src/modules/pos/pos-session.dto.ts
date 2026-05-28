import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class OpenSessionDto {
  /** Physical cash placed in the drawer when opening the shift. */
  @IsNumber()
  @Min(0)
  openingCash!: number;

  /** Optional cashier notes for the opening. */
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseSessionDto {
  /** Actual cash counted in the drawer at close. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  closingCash?: number;

  /** Cashier close notes / reconciliation comments. */
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SuspendSessionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export interface SessionSummary {
  id: number;
  storeId: string;
  cashierId: string;
  status: string;
  openingCash: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
}
