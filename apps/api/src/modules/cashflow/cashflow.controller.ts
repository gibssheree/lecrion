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

@Controller('cashflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Post('sessions/open')
  @Roles('owner', 'manager', 'cashier')
  openSession(@Body() dto: OpenSessionDto) {
    return this.cashflowService.openSession(dto);
  }

  @Post('sessions/close')
  @Roles('owner', 'manager', 'cashier')
  closeSession(@Body() dto: CloseSessionDto) {
    return this.cashflowService.closeSession(dto);
  }

  @Get('sessions/active')
  @Roles('owner', 'manager', 'cashier')
  getActiveSession(@Query('storeId') storeId?: string) {
    return this.cashflowService.getActiveSession(storeId);
  }

  @Get('sessions')
  @Roles('owner', 'manager')
  listSessions(
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cashflowService.listSessions(
      storeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('sessions/:id/balance')
  @Roles('owner', 'manager', 'cashier')
  getSessionBalance(@Param('id', ParseIntPipe) id: number) {
    return this.cashflowService
      .getSessionBalance(id)
      .then((balance) => ({ sessionId: id, balance }));
  }

  @Get('sessions/:id/entries')
  @Roles('owner', 'manager', 'cashier')
  listEntries(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    return this.cashflowService.listEntries(
      id,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Post('entries')
  @Roles('owner', 'manager', 'cashier')
  recordEntry(@Body() dto: RecordEntryDto) {
    return this.cashflowService.recordEntry(dto);
  }
}
