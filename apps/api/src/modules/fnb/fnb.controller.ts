// apps/api/src/modules/fnb/fnb.controller.ts
//
// FnbController — F&B vertical API.
//
// Dining Areas:
//   GET    /api/fnb/areas                    – list areas with tables
//   POST   /api/fnb/areas                    – create area
//   PATCH  /api/fnb/areas/:id                – update area
//   DELETE /api/fnb/areas/:id                – deactivate area
//
// Dining Tables:
//   GET    /api/fnb/tables                   – list tables (?storeId, ?available)
//   POST   /api/fnb/tables                   – create table
//   PATCH  /api/fnb/tables/:id               – update table metadata
//   PATCH  /api/fnb/tables/:id/status        – set table status
//
// Kitchen Tickets (KDS):
//   GET    /api/fnb/kitchen/tickets          – active tickets
//   GET    /api/fnb/kitchen/tickets/:id      – single ticket
//   POST   /api/fnb/kitchen/tickets          – create ticket for order
//   PATCH  /api/fnb/kitchen/tickets/:id/status       – update ticket status
//   PATCH  /api/fnb/kitchen/items/:itemId/status     – update item status

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
  UseGuards,
} from '@nestjs/common';
import {
  TablesService,
  CreateAreaDto,
  CreateTableDto,
  UpdateTableDto,
} from './tables.service';
import { KitchenService, CreateTicketDto } from './kitchen.service';
import {
  DiningTableStatusValue,
  KitchenTicketStatusValue,
  KitchenItemStatusValue,
} from './fnb.types';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';
import { PlatformModule } from '@libs/contracts/src/modules';

@Controller('fnb')
@UseGuards(ModuleCapabilityGuard)
export class FnbController {
  constructor(
    private readonly tables: TablesService,
    private readonly kitchen: KitchenService,
  ) {}

  // ── Areas ──────────────────────────────────────────────────────────────────

  @Get('areas')
  @RequireModule(PlatformModule.FNB_TABLES)
  getAreas(@Query('storeId') storeId: string) {
    return this.tables.getAreas(storeId || 'default-store');
  }

  @Post('areas')
  @RequireModule(PlatformModule.FNB_TABLES)
  createArea(@Body() body: CreateAreaDto) {
    if (!body?.name?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'name is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.tables.createArea(body);
  }

  @Patch('areas/:id')
  @RequireModule(PlatformModule.FNB_TABLES)
  updateArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<CreateAreaDto>,
  ) {
    return this.tables.updateArea(id, body);
  }

  @Delete('areas/:id')
  @RequireModule(PlatformModule.FNB_TABLES)
  deactivateArea(@Param('id', ParseIntPipe) id: number) {
    return this.tables.deactivateArea(id);
  }

  // ── Tables ─────────────────────────────────────────────────────────────────

  @Get('tables')
  @RequireModule(PlatformModule.FNB_TABLES)
  getTables(
    @Query('storeId') storeId: string,
    @Query('available') available: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    const store = storeId || 'default-store';
    if (available === 'true') return this.tables.getAvailableTables(store);
    return this.tables.getTables(store, includeInactive === 'true');
  }

  @Get('tables/:id')
  @RequireModule(PlatformModule.FNB_TABLES)
  async getTableById(@Param('id', ParseIntPipe) id: number) {
    const table = await this.tables.getTableById(id);
    if (!table)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return { table };
  }

  @Post('tables')
  @RequireModule(PlatformModule.FNB_TABLES)
  async createTable(@Body() body: CreateTableDto) {
    if (!body?.tableNumber?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'tableNumber is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const table = await this.tables.createTable(body);
      return { status: 'created', table };
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

  @Patch('tables/:id')
  @RequireModule(PlatformModule.FNB_TABLES)
  async updateTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTableDto,
  ) {
    try {
      const table = await this.tables.updateTable(id, body);
      if (!table)
        throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
      return { status: 'updated', table };
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

  @Patch('tables/:id/status')
  @RequireModule(PlatformModule.FNB_TABLES)
  async setTableStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: DiningTableStatusValue,
  ) {
    try {
      const table = await this.tables.setTableStatus(id, status);
      return { status: 'updated', table };
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

  // ── Kitchen Tickets ────────────────────────────────────────────────────────

  @Get('kitchen/tickets')
  @RequireModule(PlatformModule.FNB_KDS)
  getActiveTickets(@Query('storeId') storeId: string) {
    return this.kitchen.getActiveTickets(storeId || 'default-store');
  }

  @Get('kitchen/tickets/:id')
  @RequireModule(PlatformModule.FNB_KDS)
  async getTicketById(@Param('id', ParseIntPipe) id: number) {
    const ticket = await this.kitchen.getTicketById(id);
    if (!ticket)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return { ticket };
  }

  @Get('kitchen/order/:orderId')
  @RequireModule(PlatformModule.FNB_KDS)
  async getTicketByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    const ticket = await this.kitchen.getTicketByOrderId(orderId);
    if (!ticket)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return { ticket };
  }

  @Post('kitchen/tickets')
  @RequireModule(PlatformModule.FNB_KDS)
  async createTicket(@Body() body: CreateTicketDto) {
    if (!body?.orderId) {
      throw new HttpException(
        { status: 'error', message: 'orderId is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const ticket = await this.kitchen.createTicketForOrder(body);
      return { status: 'created', ticket };
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

  @Patch('kitchen/tickets/:id/status')
  @RequireModule(PlatformModule.FNB_KDS)
  async updateTicketStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: KitchenTicketStatusValue,
  ) {
    try {
      const ticket = await this.kitchen.updateTicketStatus(id, status);
      return { status: 'updated', ticket };
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

  @Patch('kitchen/items/:itemId/status')
  @RequireModule(PlatformModule.FNB_KDS)
  async updateItemStatus(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('status') status: KitchenItemStatusValue,
  ) {
    try {
      const ticket = await this.kitchen.updateItemStatus(itemId, status);
      return { status: 'updated', ticket };
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
}
