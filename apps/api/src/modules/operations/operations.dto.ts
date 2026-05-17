// apps/api/src/modules/operations/operations.dto.ts
//
// DTOs and response shapes for the operational documents module.
//
// Document lifecycle:
//   draft → submitted → posted   (stock movements applied on post)
//   draft → cancelled
//   submitted → cancelled
//
// Posting rules:
//   purchase_order  → no stock movement (intent only)
//   goods_receipt   → RESTOCK movement per line at destination_location_id
//   stock_transfer  → TRANSFER_OUT at source_location_id + TRANSFER_IN at destination_location_id
//   stock_adjustment → ADJUSTMENT movement per line at destination_location_id

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
import {
  OPERATION_DOCUMENT_TYPE_VALUES,
  OperationDocumentTypeValue,
} from '@libs/contracts/src/enums';

// ── Create document ───────────────────────────────────────────────────────────

export class CreateDocumentLineDto {
  @IsInt()
  @Min(1)
  menuId!: number;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class CreateOperationDocumentDto {
  @IsIn(OPERATION_DOCUMENT_TYPE_VALUES)
  documentType!: OperationDocumentTypeValue;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sourceLocationId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  destinationLocationId?: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  linkedDocumentId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentLineDto)
  lines!: CreateDocumentLineDto[];
}

// ── Submit / Post / Cancel ────────────────────────────────────────────────────

export class SubmitDocumentDto {
  @IsOptional()
  @IsString()
  operatorId?: string;
}

export class PostDocumentDto {
  @IsOptional()
  @IsString()
  operatorId?: string;
}

export class CancelDocumentDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  operatorId?: string;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface DocumentLineResponse {
  id: number;
  menuId: number;
  productName: string;
  qty: number;
  unitCost: number | null;
  metadata: string | null;
}

export interface PostingMovement {
  menuId: number;
  productName: string;
  movementType: string;
  qtyChange: number;
  locationId: number | null;
  stockBefore: number;
  stockAfter: number;
}

export interface OperationDocumentResponse {
  id: number;
  documentNumber: string;
  documentType: string;
  status: string;
  storeId: string;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  supplierId: string | null;
  supplierName: string | null;
  linkedDocumentId: number | null;
  createdBy: string;
  submittedBy: string | null;
  postedBy: string | null;
  cancelledBy: string | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  postedAt: string | null;
  cancelledAt: string | null;
  lines: DocumentLineResponse[];
}

export interface PostDocumentResponse extends OperationDocumentResponse {
  /** Stock movements created during posting */
  movements: PostingMovement[];
}
