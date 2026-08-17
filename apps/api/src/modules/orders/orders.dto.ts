// apps/api/src/modules/orders/orders.dto.ts
//
// Real class-validator DTOs for order status/cancel writes. Previously these
// were inline object-literal types on the controller's @Body() parameter,
// which the global AppValidationPipe silently skips (it only validates
// class-typed bodies) — so these endpoints ran with no request validation.

import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ORDER_STATUS_VALUES, OrderStatusValue } from '@libs/contracts/src/enums';

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUS_VALUES)
  status!: OrderStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  operatorId?: string;
}

export class CancelOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  operatorId?: string;
}
