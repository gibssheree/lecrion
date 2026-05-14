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
  CashflowService,
  OpenSessionDto,
  CloseSessionDto,
  RecordEntryDto,
} from './cashflow.service';

@Controller('cashflow')
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Post('sessions/open')
  openSession(@Body() dto: OpenSessionDto) {
    return this.cashflowService.openSession(dto);
  }

  @Post('sessions/close')
  closeSession(@Body() dto: CloseSessionDto) {
    return this.cashflowService.closeSession(dto);
  }

  @Get('sessions/active')
  getActiveSession(@Query('storeId') storeId?: string) {
    return this.cashflowService.getActiveSession(storeId);
  }

  @Get('sessions')
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
  getSessionBalance(@Param('id', ParseIntPipe) id: number) {
    return this.cashflowService
      .getSessionBalance(id)
      .then((balance) => ({ sessionId: id, balance }));
  }

  @Get('sessions/:id/entries')
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
  recordEntry(@Body() dto: RecordEntryDto) {
    return this.cashflowService.recordEntry(dto);
  }
}
