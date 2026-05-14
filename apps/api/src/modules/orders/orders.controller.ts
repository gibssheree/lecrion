import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatusValue } from '@libs/contracts/src/enums';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.ordersService.listOrders(
      status ?? 'all',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: OrderStatusValue; operatorId?: string },
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      body.status,
      body.operatorId,
    );
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string; operatorId?: string },
  ) {
    return this.ordersService.cancelOrder(id, body.reason, body.operatorId);
  }

  @Get('user/:userId')
  getOrdersByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getOrdersByUser(
      userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
