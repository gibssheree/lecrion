import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatusValue } from '@libs/contracts/src/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('owner', 'manager', 'cashier', 'support')
  listOrders(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.ordersService.listOrders(
      status ?? 'all',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @Roles('owner', 'manager', 'cashier', 'support')
  getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @Roles('owner', 'manager', 'cashier')
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
  @Roles('owner', 'manager')
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string; operatorId?: string },
  ) {
    return this.ordersService.cancelOrder(id, body.reason, body.operatorId);
  }

  @Get('user/:userId')
  @Roles('owner', 'manager', 'cashier', 'support')
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
