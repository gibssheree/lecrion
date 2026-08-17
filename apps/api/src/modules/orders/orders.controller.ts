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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { CancelOrderDto, UpdateOrderStatusDto } from './orders.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('owner', 'manager', 'cashier', 'support')
  listOrders(
    @StoreId() storeId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.listOrders(
      storeId,
      status ?? 'all',
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @Roles('owner', 'manager', 'cashier', 'support')
  getOrderById(@Param('id', ParseIntPipe) id: number, @StoreId() storeId: string) {
    return this.ordersService.getOrderById(id, storeId);
  }

  @Patch(':id/status')
  @Roles('owner', 'manager', 'cashier')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusDto,
    @StoreId() storeId: string,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      storeId,
      body.status,
      body.operatorId,
    );
  }

  @Post(':id/cancel')
  @Roles('owner', 'manager')
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelOrderDto,
    @StoreId() storeId: string,
  ) {
    return this.ordersService.cancelOrder(
      id,
      storeId,
      body.reason,
      body.operatorId,
    );
  }

  @Get('user/:userId')
  @Roles('owner', 'manager', 'cashier', 'support')
  getOrdersByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @StoreId() storeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getOrdersByUser(
      userId,
      storeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
