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
import { RegisterService } from './register.service';
import { OpenSessionDto, CloseSessionDto } from '../cashflow/cashflow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('register')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('open')
  @Roles('owner', 'manager', 'cashier')
  openSession(@Body() dto: OpenSessionDto) {
    return this.registerService.openSession(dto);
  }

  @Post('close')
  @Roles('owner', 'manager', 'cashier')
  closeSession(@Body() dto: CloseSessionDto) {
    return this.registerService.closeSession(dto);
  }

  @Post(':id/suspend')
  @Roles('owner', 'manager', 'cashier')
  suspendSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerService.suspendSession(id, user.actor);
  }

  @Post(':id/resume')
  @Roles('owner', 'manager', 'cashier')
  resumeSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registerService.resumeSession(id, user.actor);
  }

  @Get('active')
  @Roles('owner', 'manager', 'cashier')
  getActiveSession(@Query('storeId') storeId?: string) {
    return this.registerService.getActiveSession(storeId);
  }

  @Get('sessions')
  @Roles('owner', 'manager', 'cashier')
  listSessions(
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.registerService.listSessions(
      storeId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('sessions/:id')
  @Roles('owner', 'manager', 'cashier')
  getSessionById(@Param('id', ParseIntPipe) id: number) {
    return this.registerService.getSessionById(id);
  }

  @Get('sessions/:id/balance')
  @Roles('owner', 'manager', 'cashier')
  getSessionBalance(@Param('id', ParseIntPipe) id: number) {
    return this.registerService
      .getSessionBalance(id)
      .then((balance) => ({ sessionId: id, balance }));
  }
}
