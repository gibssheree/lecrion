// apps/api/src/modules/catalog/catalog.controller.ts
//
// CatalogController — multi-business product catalog API.
//
// Existing endpoints (backward compatible):
//   GET  /api/products            – list / search products
//   GET  /api/products/:id        – product detail
//   GET  /api/products/:id/movements  – stock movement history
//   PATCH /api/products/:id/stock – manual stock adjustment (dashboard)
//   POST  /api/products           – create product
//   PATCH /api/products/:id       – update product fields
//
// Phase 6A additions:
//   GET  /api/products?categoryId=N  – filter by category
//   GET  /api/products/barcode/:code – resolve barcode to product

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  CatalogService,
  CreateProductDto,
  UpdateProductDto,
} from './catalog.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { InventoryLedgerService } from '../inventory/inventory-ledger.service';
import { ProductBarcodesService } from './product-barcodes.service';
import {
  ProductVariantsService,
  CreateVariantDto,
} from './product-variants.service';
import { STOCK_EVENTS } from '@libs/contracts/src/events';
import {
  StockMovementType,
  PRODUCT_TYPE_VALUES,
  ProductVariantTypeValue,
  BarcodeTypeValue,
} from '@libs/contracts/src/enums';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly ledger: InventoryLedgerService,
    private readonly barcodes: ProductBarcodesService,
    private readonly variants: ProductVariantsService,
  ) {}

  // ── GET /api/products ──────────────────────────────────────────────────────
  @Get()
  @Roles('owner', 'manager', 'cashier', 'inventory_staff', 'support')
  async getProducts(
    @Query('q') q: string,
    @Query('categoryId') categoryId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    try {
      const keyword = String(q || '').trim();
      const showAll = includeInactive === 'true';
      const catId = categoryId ? Number(categoryId) : null;

      let products;
      if (keyword) {
        products = await this.catalogService.searchProducts(keyword);
      } else if (catId && Number.isInteger(catId) && catId > 0) {
        products = await this.catalogService.getProductsByCategoryId(
          catId,
          showAll,
        );
      } else {
        products = await this.catalogService.getAllProducts(showAll);
      }
      return { products };
    } catch {
      throw new HttpException(
        { status: 'error', message: 'failed_to_fetch_products' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ── GET /api/products/barcode/:code ────────────────────────────────────────
  @Get('barcode/:code')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getProductByBarcode(@Param('code') code: string) {
    if (!code?.trim()) {
      throw new HttpException(
        { status: 'invalid_barcode' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const productId = await this.barcodes.resolveByBarcode(code.trim());
    if (!productId) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    const product = await this.catalogService.getProductById(productId);
    if (!product) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { product };
  }

  // ── GET /api/products/:id ──────────────────────────────────────────────────
  @Get(':id')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff', 'support')
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

  // ── GET /api/products/:id/movements ───────────────────────────────────────
  @Get(':id/movements')
  @Roles('owner', 'manager', 'inventory_staff')
  async getProductMovements(
    @Param('id') idParam: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const product = await this.catalogService.getProductById(id);
    if (!product) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    const result = await this.ledger.listMovements({
      menuId: id,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
    return result;
  }

  // ── POST /api/products ─────────────────────────────────────────────────────
  @Post()
  @Roles('owner', 'manager')
  async createProduct(@Body() body: CreateProductDto) {
    if (!body?.name || !body?.price) {
      throw new HttpException(
        { status: 'error', message: 'name and price are required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (body.productType && !PRODUCT_TYPE_VALUES.includes(body.productType)) {
      throw new HttpException(
        {
          status: 'error',
          message: `invalid product_type; valid values: ${PRODUCT_TYPE_VALUES.join(', ')}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const product = await this.catalogService.createProduct(body);
    this.audit.record({
      actor: body.sku ?? 'api',
      action: 'product.created',
      resource: 'menu',
      resourceId: product.id,
      before: null,
      after: {
        name: product.name,
        productType: product.productType,
        categoryId: product.categoryId,
      },
      channel: 'api',
    });
    return { status: 'created', product };
  }

  // ── PATCH /api/products/:id ────────────────────────────────────────────────
  @Patch(':id')
  @Roles('owner', 'manager')
  async updateProduct(
    @Param('id') idParam: string,
    @Body() body: UpdateProductDto,
  ) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    if (body.productType && !PRODUCT_TYPE_VALUES.includes(body.productType)) {
      throw new HttpException(
        {
          status: 'error',
          message: `invalid product_type; valid values: ${PRODUCT_TYPE_VALUES.join(', ')}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const existing = await this.catalogService.getProductById(id);
    if (!existing) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    const updated = await this.catalogService.updateProduct(id, body);
    this.audit.record({
      actor: 'api',
      action: 'product.updated',
      resource: 'menu',
      resourceId: id,
      before: {
        name: existing.name,
        productType: existing.productType,
        categoryId: existing.categoryId,
      },
      after: {
        name: updated!.name,
        productType: updated!.productType,
        categoryId: updated!.categoryId,
      },
      channel: 'api',
    });
    return { status: 'updated', product: updated };
  }

  // ── PATCH /api/products/:id/stock ─────────────────────────────────────────
  @Patch(':id/stock')
  @Roles('owner', 'manager', 'inventory_staff')
  async updateStock(
    @Param('id') idParam: string,
    @Body('stock') stockParam: number,
    @Body('note') noteParam: string,
    @Body('operatorId') operatorIdParam: string,
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
    const qtyChange = stock - oldStock;

    await this.catalogService.updateStock(id, stock);

    const note =
      (noteParam || '').trim() ||
      `Manual stock adjustment: ${oldStock} → ${stock}`;
    const operatorId = (operatorIdParam || '').trim() || 'dashboard';

    await this.ledger.appendMovementLog({
      menuId: id,
      qtyBefore: oldStock,
      qtyChange,
      qtyAfter: stock,
      movementType: StockMovementType.ADJUSTMENT,
      note,
      operatorId,
      sourceRef: 'dashboard-manual',
    });

    this.audit.record({
      actor: operatorId,
      action: STOCK_EVENTS.ADJUSTED,
      resource: 'menu',
      resourceId: id,
      before: { stock: oldStock },
      after: { stock },
      channel: 'dashboard',
    });

    this.realtime.emit(STOCK_EVENTS.ADJUSTED, {
      productId: id,
      name: product.name,
      oldStock,
      stock,
    });

    if (stock <= 5 && stock >= 0) {
      this.realtime.emit(STOCK_EVENTS.LOW, {
        productId: id,
        name: product.name,
        stock,
      });
    }

    return { status: 'success', id, stock, qtyChange };
  }

  // ── Phase 12: Variants CRUD ───────────────────────────────────────────────

  @Get(':id/variants')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async listVariants(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const variants = await this.variants.getVariantsForParent(id);
    return { variants };
  }

  @Post(':id/variants')
  @Roles('owner', 'manager')
  async createVariant(
    @Param('id') idParam: string,
    @Body()
    body: {
      variantProductId: number;
      variantType?: ProductVariantTypeValue;
      variantValue: string;
      sortOrder?: number;
    },
  ) {
    const parentId = Number(idParam);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    if (!body?.variantProductId || !body?.variantValue) {
      throw new HttpException(
        {
          status: 'error',
          message: 'variantProductId and variantValue are required',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const dto: CreateVariantDto = {
      parentProductId: parentId,
      variantProductId: Number(body.variantProductId),
      variantType: body.variantType,
      variantValue: body.variantValue,
      sortOrder: body.sortOrder,
    };
    const variant = await this.variants.create(dto);
    this.audit.record({
      actor: 'api',
      action: 'product.variant.created',
      resource: 'product_variants',
      resourceId: variant.id,
      after: variant,
      channel: 'api',
    });
    return { status: 'created', variant };
  }

  @Delete('variants/:variantId')
  @Roles('owner', 'manager')
  async removeVariant(@Param('variantId') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const variant = await this.variants.deactivate(id);
    if (!variant) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { status: 'deactivated', variant };
  }

  // ── Phase 12: Barcodes CRUD ────────────────────────────────────────────────

  @Get(':id/barcodes')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async listBarcodes(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const list = await this.barcodes.getBarcodesForProduct(id);
    return { barcodes: list };
  }

  @Post(':id/barcodes')
  @Roles('owner', 'manager')
  async addBarcode(
    @Param('id') idParam: string,
    @Body()
    body: {
      barcode: string;
      barcodeType?: BarcodeTypeValue;
      isPrimary?: boolean;
    },
  ) {
    const menuId = Number(idParam);
    if (!Number.isInteger(menuId) || menuId <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    if (!body?.barcode?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'barcode is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const barcode = await this.barcodes.addBarcode({
      menuId,
      barcode: body.barcode.trim(),
      barcodeType: body.barcodeType,
      isPrimary: body.isPrimary,
    });
    this.audit.record({
      actor: 'api',
      action: 'product.barcode.added',
      resource: 'product_barcodes',
      resourceId: barcode.id,
      after: barcode,
      channel: 'api',
    });
    return { status: 'created', barcode };
  }

  @Delete('barcodes/:barcodeId')
  @Roles('owner', 'manager')
  async removeBarcode(@Param('barcodeId') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const ok = await this.barcodes.removeBarcode(id);
    if (!ok) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { status: 'deleted' };
  }
}
