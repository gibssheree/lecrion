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
  CashflowService,
  OpenSessionDto,
  CloseSessionDto,
  RecordEntryDto,
} from './cashflow.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreId } from '../../common/decorators/store-id.decorator';

@Controller('cashflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Post('sessions/open')
  @Roles('owner', 'manager', 'cashier')
  openSession(@Body() dto: OpenSessionDto, @StoreId() storeId: string) {
    return this.cashflowService.openSession(storeId, dto);
  }

  @Post('sessions/close')
  @Roles('owner', 'manager', 'cashier')
  closeSession(@Body() dto: CloseSessionDto, @StoreId() storeId: string) {
    return this.cashflowService.closeSession(storeId, dto);
  }

  @Get('sessions/active')
  @Roles('owner', 'manager', 'cashier')
  getActiveSession(@StoreId() storeId: string) {
    return this.cashflowService.getActiveSession(storeId);
  }

  @Get('sessions')
  @Roles('owner', 'manager')
  listSessions(@StoreId() storeId: string, @Query('limit') limit?: string) {
    return this.cashflowService.listSessions(
      storeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('sessions/:id/balance')
  @Roles('owner', 'manager', 'cashier')
  getSessionBalance(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
  ) {
    return this.cashflowService
      .getSessionBalance(id, storeId)
      .then((balance) => ({ sessionId: id, balance }));
  }

  @Get('sessions/:id/entries')
  @Roles('owner', 'manager', 'cashier')
  listEntries(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.cashflowService.listEntries(
      id,
      storeId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Post('entries')
  @Roles('owner', 'manager', 'cashier')
  recordEntry(@Body() dto: RecordEntryDto, @StoreId() storeId: string) {
    return this.cashflowService.recordEntry(storeId, dto);
  }
}
