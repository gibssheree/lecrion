import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const POS_ORDER_TYPES = ['pickup', 'dine_in', 'delivery'] as const;
export type PosOrderType = (typeof POS_ORDER_TYPES)[number];
export const POS_TAX_MODES = ['exclusive', 'inclusive'] as const;
export type PosTaxModeDto = (typeof POS_TAX_MODES)[number];

export class CreatePosSaleItemDto {
  @IsInt()
  @Min(1)
  productId!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePosSalePaymentDto {
  @IsString()
  method!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  /**
   * For cash: the physical amount handed over (>= amount).
   * For non-cash: omit or set equal to amount.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreatePosSaleDto {
  @IsString()
  clientSaleId!: string;

  @IsInt()
  @Min(1)
  registerSessionId!: number;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsString()
  cashierId!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsIn(POS_ORDER_TYPES)
  orderType!: PosOrderType;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePosSaleItemDto)
  items!: CreatePosSaleItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePosSalePaymentDto)
  payments!: CreatePosSalePaymentDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsIn(POS_TAX_MODES)
  taxMode?: PosTaxModeDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceChargeAmount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @IsOptional()
  @IsString()
  courierName?: string;
}

export interface PosSaleReceipt {
  saleId: string;
  orderId: number;
  receiptNumber: string;
  registerSessionId: number;
  cashierId: string;
  customerName: string;
  channel?: string;
  externalOrderId?: string;
  courierName?: string;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  taxMode?: PosTaxModeDto;
  serviceChargeAmount: number;
  total: number;
  paidTotal: number;
  change: number;
  paymentMethods: string[];
  /** Per-line payment breakdown for split payment display */
  paymentLines: Array<{
    method: string;
    amount: number;
    paidAmount: number;
    reference?: string;
  }>;
  items: Array<{
    productId: number;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  createdAt: string;
}
