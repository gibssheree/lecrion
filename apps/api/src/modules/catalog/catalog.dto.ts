// apps/api/src/modules/catalog/catalog.dto.ts
//
// Real class-validator DTOs for product create/update.
//
// Previously these were plain TS interfaces (CreateProductDto/UpdateProductDto
// used to live inline in catalog.service.ts). NestJS's ValidationPipe only
// validates class-typed request bodies — a plain interface is erased at
// compile time and the global AppValidationPipe silently does nothing for it,
// so `whitelist`/`forbidNonWhitelisted` never ran on these endpoints. Moving
// to real classes with decorators makes that protection actually apply.

import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PRODUCT_TYPE_VALUES, ProductTypeValue } from '@libs/contracts/src/enums';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPE_VALUES)
  productType?: ProductTypeValue;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsString()
  unitCode?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  attributes?: string;

  @IsOptional()
  @IsInt()
  parentProductId?: number;

  @IsOptional()
  @IsBoolean()
  isStockTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}

// Every field optional for PATCH semantics — not `Partial<CreateProductDto>`
// because class-validator decorators must be declared per-class, not
// inherited through a TS utility type.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPE_VALUES)
  productType?: ProductTypeValue;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsString()
  unitCode?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  attributes?: string;

  @IsOptional()
  @IsInt()
  parentProductId?: number;

  @IsOptional()
  @IsBoolean()
  isStockTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}
