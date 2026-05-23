// apps/api/src/modules/reports/reports.controller.ts
// Phase 9: Added @Roles guards to all endpoints.
// Reports are read-only — cashier can see shift/POS data; owner/manager see all.

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';
import { PosReportsService } from './pos-reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly readModel: ReadModelService,
    private readonly posReports: PosReportsService,
  ) {}

  // ─── Legacy reports ─────────────────────────────────────────────────────────

  @Get('summary')
  @Roles('owner', 'manager')
  getSalesSummary() {
    return this.reportsService.getSalesSummary();
  }

  @Get('daily')
  @Roles('owner', 'manager')
  getSalesDaily(@Query('limit') limit?: string) {
    return this.reportsService.getSalesDaily(limit ? parseInt(limit, 10) : 14);
  }

  @Get('by-payment')
  @Roles('owner', 'manager')
  getSalesByPayment() {
    return this.reportsService.getSalesByPayment();
  }

  @Get('by-type')
  @Roles('owner', 'manager')
  getSalesByType() {
    return this.reportsService.getSalesByType();
  }

  @Get('top-products')
  @Roles('owner', 'manager')
  getSalesTopProducts(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getSalesTopProducts({
      year: year ? parseInt(year, 10) : undefined,
      month: month ? parseInt(month, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 5,
    });
  }

  @Get('stock-changes')
  @Roles('owner', 'manager', 'inventory_staff')
  getStockChangeLogs(@Query('limit') limit?: string) {
    return this.reportsService.getStockChangeLogs(
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('year/:year')
  @Roles('owner', 'manager')
  getYearBundle(@Param('year') year: string) {
    return this.reportsService.getYearDetailBundle(parseInt(year, 10));
  }

  @Get('year/:year/month/:month')
  @Roles('owner', 'manager')
  getMonthBundle(@Param('year') year: string, @Param('month') month: string) {
    return this.reportsService.getMonthDetailBundle(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  // ─── Read model projections ─────────────────────────────────────────────────

  @Get('projections')
  @Roles('owner', 'manager', 'cashier')
  getAllProjections() {
    return this.readModel.getAll();
  }

  @Get('projections/:name')
  @Roles('owner', 'manager', 'cashier')
  getProjection(@Param('name') name: string) {
    return this.readModel.get(name as any);
  }

  @Get('projections/:name/rebuild')
  @Roles('owner', 'manager')
  rebuildProjection(@Param('name') name: string) {
    return this.readModel
      .rebuild(name as any)
      .then(() => ({ ok: true, projection: name }));
  }

  @Get('projections-rebuild-all')
  @Roles('owner', 'manager')
  rebuildAll() {
    return this.readModel.rebuildAll().then(() => ({ ok: true }));
  }

  // ─── POS Enterprise Reporting ───────────────────────────────────────────────

  @Get('pos/summary')
  @Roles('owner', 'manager', 'cashier')
  getPosSummary(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.posReports.getPosSummary({ storeId, dateFrom, dateTo });
  }

  @Get('pos/daily')
  @Roles('owner', 'manager', 'cashier')
  getPosDaily(
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posReports.getPosDaily({
      storeId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('pos/payment-mix')
  @Roles('owner', 'manager', 'cashier')
  getPosPaymentMix(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.posReports.getPosPaymentMix({ storeId, dateFrom, dateTo });
  }

  @Get('pos/corrections')
  @Roles('owner', 'manager')
  getPosCorrections(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posReports.getPosCorrections({
      storeId,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('pos/shift/:sessionId')
  @Roles('owner', 'manager', 'cashier')
  getPosShift(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.posReports.getShiftReconciliation(sessionId);
  }

  @Get('pos/top-products')
  @Roles('owner', 'manager', 'cashier')
  getPosTopProducts(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posReports.getPosTopProducts({
      storeId,
      dateFrom,
      dateTo,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Phase 10: Analytics ────────────────────────────────────────────────────

  @Get('pos/hourly')
  @Roles('owner', 'manager', 'cashier')
  getPosHourly(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
  ) {
    return this.posReports.getPosHourly({ storeId, date });
  }

  @Get('pos/cashier-performance')
  @Roles('owner', 'manager')
  getCashierPerformance(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.posReports.getCashierPerformance({ storeId, dateFrom, dateTo });
  }

  @Get('pos/promo-performance')
  @Roles('owner', 'manager')
  getPromoPerformance(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.posReports.getPromoPerformance({ storeId, dateFrom, dateTo });
  }

  @Get('pos/customer-repeat')
  @Roles('owner', 'manager')
  getCustomerRepeatRate(
    @Query('storeId') storeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.posReports.getCustomerRepeatRate({ storeId, dateFrom, dateTo });
  }

  @Get('pos/daily-close-summary')
  @Roles('owner', 'manager')
  getDailyCloseSummary(@Query('storeId') storeId?: string) {
    return this.posReports
      .formatDailyCloseSummary(storeId)
      .then((text) => ({ text }));
  }

  @Get('pos/low-stock-alert')
  @Roles('owner', 'manager', 'inventory_staff')
  getLowStockAlert(@Query('storeId') storeId?: string) {
    return this.posReports
      .formatLowStockAlert(storeId)
      .then((text) => ({ text }));
  }

  // ─── Phase 11: Forecasting ──────────────────────────────────────────────────

  @Get('pos/forecast')
  @Roles('owner', 'manager')
  getForecast(@Query('storeId') storeId?: string) {
    return this.posReports.getForecast({ storeId });
  }
}
