import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  PaymentsService,
  RecordPaymentDto,
  ConfirmPaymentDto,
} from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(dto);
  }

  @Post('confirm')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Get()
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
  getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('order/:orderId')
  getPaymentsByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentsByOrder(orderId);
  }
}
