import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  PaymentsService,
  RecordPaymentDto,
  ConfirmPaymentDto,
} from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles('owner', 'manager', 'cashier')
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(dto);
  }

  @Post('confirm')
  @Roles('owner', 'manager', 'cashier')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Get()
  @Roles('owner', 'manager')
  listPayments(
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listPayments(
      storeId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get(':id')
  @Roles('owner', 'manager', 'cashier')
  getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  @Roles('owner', 'manager', 'cashier')
  getPaymentsByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentsByOrder(orderId);
  }
}
