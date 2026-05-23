import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './invoices.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get('summary')
  @Roles('owner', 'manager')
  getSummary(@Query('storeId') storeId?: string) {
    return this.invoices.getSummary(storeId);
  }

  @Get()
  @Roles('owner', 'manager', 'cashier')
  list(
    @Query('storeId') storeId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.invoices.listInvoices({
      storeId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles('owner', 'manager', 'cashier')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.invoices.getInvoice(id);
  }

  @Post()
  @Roles('owner', 'manager', 'cashier')
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthUser) {
    return this.invoices.createInvoice(dto, user.actor ?? user.email);
  }

  @Patch(':id/status')
  @Roles('owner', 'manager')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.invoices.updateStatus(id, dto, user.actor ?? user.email);
  }
}
