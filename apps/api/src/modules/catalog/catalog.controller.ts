import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { STOCK_EVENTS } from '@libs/contracts/src/events';

@Controller('products')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  @Get()
  async getProducts(@Query('q') q: string) {
    try {
      const keyword = String(q || '').trim();
      const products = keyword
        ? await this.catalogService.searchProducts(keyword)
        : await this.catalogService.getAllProducts();
      return { products };
    } catch (error: any) {
      throw new HttpException(
        { status: 'error', message: 'failed_to_fetch_products' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get(':id')
  async getProductById(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const product = await this.catalogService.getProductById(id);
    if (!product) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { product };
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') idParam: string,
    @Body('stock') stockParam: number,
  ) {
    const id = Number(idParam);
    const stock = Number(stockParam);

    if (!Number.isInteger(id) || !Number.isInteger(stock) || stock < 0) {
      throw new HttpException(
        { status: 'error', message: 'invalid input' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const product = await this.catalogService.getProductById(id);
    if (!product) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }

    const oldStock = product.stock;
    await this.catalogService.updateStock(id, stock);

    // Audit the manual stock edit
    this.audit.record({
      actor: 'dashboard',
      action: STOCK_EVENTS.ADJUSTED,
      resource: 'menu',
      resourceId: id,
      before: { stock: oldStock },
      after: { stock },
      channel: 'dashboard',
    });

    // Emit realtime event so live feed and bot overview update immediately
    this.realtime.emit(STOCK_EVENTS.ADJUSTED, {
      productId: id,
      name: product.name,
      oldStock,
      stock,
    });

    // Emit low-stock alert if threshold crossed
    if (stock <= 5 && stock >= 0) {
      this.realtime.emit(STOCK_EVENTS.LOW, {
        productId: id,
        name: product.name,
        stock,
      });
    }

    return { status: 'success', id, stock };
  }
}
