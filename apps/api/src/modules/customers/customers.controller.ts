// apps/api/src/modules/customers/customers.controller.ts
//
// CustomersController — customer, loyalty, and promotion API.
//
// Customers:
//   GET    /api/customers              – list (?storeId, ?limit, ?offset)
//   GET    /api/customers/search       – search by name/phone (?q)
//   GET    /api/customers/:id          – single customer
//   GET    /api/customers/:id/history  – purchase history
//   GET    /api/customers/:id/points   – point balance + history
//   POST   /api/customers              – create customer
//   PATCH  /api/customers/:id          – update customer
//   DELETE /api/customers/:id          – deactivate customer
//
// Loyalty:
//   GET    /api/customers/loyalty/program          – active program
//   POST   /api/customers/loyalty/program          – create/replace program
//   POST   /api/customers/loyalty/:id/earn         – earn points (post-sale)
//   POST   /api/customers/loyalty/:id/redeem       – redeem points
//   POST   /api/customers/loyalty/:id/adjust       – manual adjustment
//
// Promotions:
//   GET    /api/customers/promotions               – list promotions
//   POST   /api/customers/promotions               – create promotion
//   PATCH  /api/customers/promotions/:id/activate  – activate
//   PATCH  /api/customers/promotions/:id/pause     – pause
//   GET    /api/customers/promotions/calculate     – calculate discount (?total, ?storeId, ?voucherCode)
//
// Vouchers:
//   GET    /api/customers/vouchers                 – list vouchers
//   POST   /api/customers/vouchers                 – create voucher

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  CustomersService,
  CreateCustomerDto,
  UpdateCustomerDto,
} from './customers.service';
import { LoyaltyService } from './loyalty.service';
import {
  PromotionsService,
  CreatePromotionDto,
  CreateVoucherDto,
} from './promotions.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly loyalty: LoyaltyService,
    private readonly promotions: PromotionsService,
  ) {}

  // ── Customer CRUD ──────────────────────────────────────────────────────────

  @Get('search')
  searchCustomers(@Query('q') q: string, @Query('storeId') storeId: string) {
    return this.customers.search(q || '', storeId || 'default-store');
  }

  @Get('loyalty/program')
  getLoyaltyProgram(@Query('storeId') storeId: string) {
    return this.loyalty.getActiveProgram(storeId || 'default-store');
  }

  @Post('loyalty/program')
  createLoyaltyProgram(@Body() body: any) {
    return this.loyalty.createProgram(body);
  }

  @Get('promotions/calculate')
  async calculateDiscount(
    @Query('total') total: string,
    @Query('storeId') storeId: string,
    @Query('voucherCode') voucherCode: string,
  ) {
    const orderTotal = parseFloat(total);
    if (isNaN(orderTotal) || orderTotal < 0) {
      throw new HttpException(
        { status: 'error', message: 'total must be a positive number' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      return this.promotions.calculateDiscount(
        orderTotal,
        storeId || 'default-store',
        voucherCode || undefined,
      );
    } catch (err: any) {
      if (err?.name === 'NotFoundException') {
        throw new HttpException(
          { status: 'not_found', message: err.message },
          HttpStatus.NOT_FOUND,
        );
      }
      if (err?.name === 'BadRequestException') {
        throw new HttpException(
          { status: 'error', message: err.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  @Get('promotions')
  listPromotions(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.promotions.listPromotions(
      storeId || 'default-store',
      status || undefined,
    );
  }

  @Post('promotions')
  createPromotion(@Body() body: CreatePromotionDto) {
    if (!body?.name || body?.discountValue == null) {
      throw new HttpException(
        { status: 'error', message: 'name and discountValue are required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.promotions.createPromotion(body);
  }

  @Patch('promotions/:id/activate')
  async activatePromotion(@Param('id', ParseIntPipe) id: number) {
    try {
      return this.promotions.activatePromotion(id);
    } catch (err: any) {
      if (err?.name === 'NotFoundException') {
        throw new HttpException(
          { status: 'not_found', message: err.message },
          HttpStatus.NOT_FOUND,
        );
      }
      throw err;
    }
  }

  @Patch('promotions/:id/pause')
  pausePromotion(@Param('id', ParseIntPipe) id: number) {
    return this.promotions.pausePromotion(id);
  }

  @Get('vouchers')
  listVouchers(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.promotions.listVouchers(
      storeId || 'default-store',
      status || undefined,
    );
  }

  @Post('vouchers')
  async createVoucher(@Body() body: CreateVoucherDto) {
    try {
      return this.promotions.createVoucher(body);
    } catch (err: any) {
      if (err?.name === 'BadRequestException') {
        throw new HttpException(
          { status: 'error', message: err.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  @Get()
  listCustomers(
    @Query('storeId') storeId: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
  ) {
    return this.customers.list(
      storeId || 'default-store',
      Number(limit) || 50,
      Number(offset) || 0,
    );
  }

  @Get(':id')
  async getCustomer(@Param('id', ParseIntPipe) id: number) {
    const customer = await this.customers.getById(id);
    if (!customer)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return { customer };
  }

  @Get(':id/history')
  getPurchaseHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: string,
  ) {
    return this.customers.getPurchaseHistory(id, Number(limit) || 20);
  }

  @Get(':id/points')
  async getPoints(
    @Param('id', ParseIntPipe) id: number,
    @Query('storeId') storeId: string,
  ) {
    const store = storeId || 'default-store';
    const balance = await this.loyalty.getBalance(id, store);
    const history = await this.loyalty.getPointHistory(id, store);
    return { customerId: id, balance, history };
  }

  @Post()
  async createCustomer(@Body() body: CreateCustomerDto) {
    if (!body?.name?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'name is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const customer = await this.customers.create(body);
      return { status: 'created', customer };
    } catch (err: any) {
      if (err?.name === 'ConflictException') {
        throw new HttpException(
          { status: 'conflict', message: err.message },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  @Patch(':id')
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCustomerDto,
  ) {
    try {
      const customer = await this.customers.update(id, body);
      if (!customer)
        throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
      return { status: 'updated', customer };
    } catch (err: any) {
      if (err?.name === 'ConflictException') {
        throw new HttpException(
          { status: 'conflict', message: err.message },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  @Delete(':id')
  async deactivateCustomer(@Param('id', ParseIntPipe) id: number) {
    const customer = await this.customers.deactivate(id);
    if (!customer)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return { status: 'deactivated', customer };
  }

  // ── Loyalty endpoints ──────────────────────────────────────────────────────

  @Post('loyalty/:id/earn')
  async earnPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { saleTotal: number; saleId: number | string; storeId?: string },
  ) {
    return this.loyalty.earnPoints({
      customerId: id,
      saleTotal: body.saleTotal,
      saleId: body.saleId,
      storeId: body.storeId,
    });
  }

  @Post('loyalty/:id/redeem')
  async redeemPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      pointsToRedeem: number;
      saleId?: number | string;
      storeId?: string;
    },
  ) {
    try {
      return this.loyalty.redeemPoints({
        customerId: id,
        pointsToRedeem: body.pointsToRedeem,
        saleId: body.saleId,
        storeId: body.storeId,
      });
    } catch (err: any) {
      if (err?.name === 'BadRequestException') {
        throw new HttpException(
          { status: 'error', message: err.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  @Post('loyalty/:id/adjust')
  async adjustPoints(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { points: number; note: string; storeId?: string },
  ) {
    try {
      return this.loyalty.adjustPoints(
        id,
        body.points,
        body.note,
        body.storeId,
      );
    } catch (err: any) {
      if (err?.name === 'BadRequestException') {
        throw new HttpException(
          { status: 'error', message: err.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }
}
