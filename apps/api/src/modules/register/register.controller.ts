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
import { RegisterService, CashAdjustmentDto } from './register.service';
import { OpenSessionDto, CloseSessionDto } from '../cashflow/cashflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StoreId } from '../../common/decorators/store-id.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('register')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('open')
  @Roles('owner', 'manager', 'cashier')
  openSession(@Body() dto: OpenSessionDto, @StoreId() storeId: string) {
    return this.registerService.openSession(storeId, dto);
  }

  @Post('close')
  @Roles('owner', 'manager', 'cashier')
  closeSession(@Body() dto: CloseSessionDto, @StoreId() storeId: string) {
    return this.registerService.closeSession(storeId, dto);
  }

  @Post(':id/suspend')
  @Roles('owner', 'manager', 'cashier')
  suspendSession(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerService.suspendSession(id, storeId, user.actor);
  }

  @Post(':id/resume')
  @Roles('owner', 'manager', 'cashier')
  resumeSession(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerService.resumeSession(id, storeId, user.actor);
  }

  @Get('active')
  @Roles('owner', 'manager', 'cashier')
  getActiveSession(@StoreId() storeId: string) {
    return this.registerService.getActiveSession(storeId);
  }

  @Get('sessions')
  @Roles('owner', 'manager', 'cashier')
  listSessions(@StoreId() storeId: string, @Query('limit') limit?: string) {
    return this.registerService.listSessions(
      storeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('sessions/:id')
  @Roles('owner', 'manager', 'cashier')
  getSessionById(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
  ) {
    return this.registerService.getSessionById(id, storeId);
  }

  @Get('sessions/:id/balance')
  @Roles('owner', 'manager', 'cashier')
  getSessionBalance(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
  ) {
    return this.registerService
      .getSessionBalance(id, storeId)
      .then((balance) => ({ sessionId: id, balance }));
  }

  /**
   * Phase 2: GET /api/register/sessions/:id/summary
   *
   * Returns a full ledger-derived shift summary including:
   * opening cash, cash sales, non-cash sales by method, cash in/out,
   * refunds, expected cash, counted cash, variance, transaction count,
   * sold products summary, first/last sale time, cashier ID.
   */
  @Get('sessions/:id/summary')
  @Roles('owner', 'manager', 'cashier')
  getSessionSummary(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
  ) {
    return this.registerService.getSessionSummary(id, storeId);
  }

  /**
   * Phase 2: POST /api/register/sessions/:id/cash-adjustments
   *
   * Record a manual cash adjustment for an open session.
   * Supported types: cash_in | cash_out | expense | refund
   * Uses existing cashflow_entries — no schema changes required.
   */
  @Post('sessions/:id/cash-adjustments')
  @Roles('owner', 'manager', 'cashier')
  recordCashAdjustment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CashAdjustmentDto,
    @StoreId() storeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // Allow operatorId from body; fall back to authenticated user
    const adjustmentDto: CashAdjustmentDto = {
      ...dto,
      operatorId: dto.operatorId || user.actor,
    };
    return this.registerService.recordCashAdjustment(
      id,
      storeId,
      adjustmentDto,
    );
  }
}
