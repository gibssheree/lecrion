// apps/api/src/modules/inventory/stock-opname.controller.ts
//
// Endpoints:
//   GET    /api/stock-opname/sessions                   — list (?storeId, ?status, ?limit)
//   GET    /api/stock-opname/sessions/:id               — session detail with lines
//   POST   /api/stock-opname/sessions                   — create draft session
//   PATCH  /api/stock-opname/sessions/:id/lines/:lineId — update counted_qty
//   POST   /api/stock-opname/sessions/:id/submit        — submit for review
//   POST   /api/stock-opname/sessions/:id/post          — post (apply ledger)
//   POST   /api/stock-opname/sessions/:id/cancel        — cancel session

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  StockOpnameService,
  CreateOpnameSessionDto,
  UpdateOpnameLineDto,
  StockOpnameStatus,
} from './stock-opname.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('stock-opname')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockOpnameController {
  constructor(private readonly opname: StockOpnameService) {}

  @Get('sessions')
  @Roles('owner', 'manager', 'inventory_staff')
  listSessions(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
  ) {
    return this.opname.listSessions(
      storeId || 'default-store',
      (status || undefined) as StockOpnameStatus | undefined,
      Number(limit) || 50,
    );
  }

  @Get('sessions/:id')
  @Roles('owner', 'manager', 'inventory_staff')
  async getSession(@Param('id', ParseIntPipe) id: number) {
    const session = await this.opname.getSessionById(id);
    if (!session) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return session;
  }

  @Post('sessions')
  @Roles('owner', 'manager', 'inventory_staff')
  createSession(
    @Body() body: Omit<CreateOpnameSessionDto, 'createdBy'>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opname.createSession({
      ...body,
      createdBy: user.actor || user.email || 'system',
    });
  }

  @Patch('sessions/:id/lines/:lineId')
  @Roles('owner', 'manager', 'inventory_staff')
  updateLine(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() body: UpdateOpnameLineDto,
  ) {
    return this.opname.updateLine(id, lineId, body);
  }

  @Post('sessions/:id/submit')
  @Roles('owner', 'manager', 'inventory_staff')
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.opname.submitSession(id);
  }

  @Post('sessions/:id/post')
  @Roles('owner', 'manager')
  post(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.opname.postSession(id, user.actor || user.email || 'system');
  }

  @Post('sessions/:id/cancel')
  @Roles('owner', 'manager', 'inventory_staff')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.opname.cancelSession(
      id,
      user.actor || user.email || 'system',
      reason,
    );
  }
}
