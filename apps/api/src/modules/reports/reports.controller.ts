import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReadModelService } from './read-model.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly readModel: ReadModelService,
  ) {}

  @Get('summary')
  getSalesSummary() {
    return this.reportsService.getSalesSummary();
  }

  @Get('daily')
  getSalesDaily(@Query('limit') limit?: string) {
    return this.reportsService.getSalesDaily(limit ? parseInt(limit, 10) : 14);
  }

  @Get('by-payment')
  getSalesByPayment() {
    return this.reportsService.getSalesByPayment();
  }

  @Get('by-type')
  getSalesByType() {
    return this.reportsService.getSalesByType();
  }

  @Get('top-products')
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
  getStockChangeLogs(@Query('limit') limit?: string) {
    return this.reportsService.getStockChangeLogs(
      limit ? parseInt(limit, 10) : 30,
    );
  }

  @Get('year/:year')
  getYearBundle(@Param('year') year: string) {
    return this.reportsService.getYearDetailBundle(parseInt(year, 10));
  }

  @Get('year/:year/month/:month')
  getMonthBundle(@Param('year') year: string, @Param('month') month: string) {
    return this.reportsService.getMonthDetailBundle(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  // ─── Read model projections ─────────────────────────────────────────────────

  @Get('projections')
  getAllProjections() {
    return this.readModel.getAll();
  }

  @Get('projections/:name')
  getProjection(@Param('name') name: string) {
    return this.readModel.get(name as any);
  }

  @Get('projections/:name/rebuild')
  rebuildProjection(@Param('name') name: string) {
    return this.readModel
      .rebuild(name as any)
      .then(() => ({ ok: true, projection: name }));
  }

  @Get('projections-rebuild-all')
  rebuildAll() {
    return this.readModel.rebuildAll().then(() => ({ ok: true }));
  }
}
