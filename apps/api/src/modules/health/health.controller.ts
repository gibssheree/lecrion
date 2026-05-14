import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/health
   * Used by Docker HEALTHCHECK, load balancers, and monitoring.
   * Returns 200 when healthy, 503 when unhealthy.
   * Marked @Public() — no auth required.
   */
  @Get('health')
  @Public()
  async health(@Res() res: Response) {
    const report = await this.healthService.check();
    const httpStatus =
      report.status === 'unhealthy'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    return res.status(httpStatus).json(report);
  }

  /**
   * GET /api/metrics
   * Prometheus-compatible text format.
   * Marked @Public() — no auth required (scraper access).
   */
  @Get('metrics')
  @Public()
  metrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    return res.status(HttpStatus.OK).send(this.healthService.metrics());
  }
}
