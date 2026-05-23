import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceLineDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  qty: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  @IsIn(['cod', 'net_7', 'net_14', 'net_30', 'net_60'])
  paymentTerms?: string;

  @IsString()
  issueDate: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}

export class UpdateInvoiceStatusDto {
  @IsString()
  @IsIn(['draft', 'issued', 'paid', 'overdue', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  paidDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
