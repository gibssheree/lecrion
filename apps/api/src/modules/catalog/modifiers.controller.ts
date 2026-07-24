// apps/api/src/modules/catalog/modifiers.controller.ts
//
// Endpoints:
//   GET    /api/modifiers/groups             — list groups (?storeId, ?includeInactive)
//   GET    /api/modifiers/groups/:id         — group detail
//   POST   /api/modifiers/groups             — create group (with options)
//   PATCH  /api/modifiers/groups/:id         — update group meta
//   DELETE /api/modifiers/groups/:id         — soft delete group
//
//   POST   /api/modifiers/groups/:id/options — add option to group
//   PATCH  /api/modifiers/options/:id        — update option
//   DELETE /api/modifiers/options/:id        — soft delete option
//
//   GET    /api/modifiers/products/:menuId   — list groups linked to a product
//   PUT    /api/modifiers/products/:menuId   — replace product's group links

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ModifiersService,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  ModifierOptionDto,
} from './modifiers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('modifiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModifiersController {
  constructor(private readonly modifiers: ModifiersService) {}

  @Get('groups')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  listGroups(
    @Query('storeId') storeId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    return this.modifiers.listGroups(
      storeId || 'default-store',
      includeInactive === 'true',
    );
  }

  @Get('groups/:id')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getGroup(@Param('id', ParseIntPipe) id: number) {
    const group = await this.modifiers.getGroupById(id);
    if (!group)
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    return group;
  }

  @Post('groups')
  @Roles('owner', 'manager')
  createGroup(@Body() body: CreateModifierGroupDto) {
    return this.modifiers.createGroup(body);
  }

  @Patch('groups/:id')
  @Roles('owner', 'manager')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateModifierGroupDto,
  ) {
    return this.modifiers.updateGroup(id, body);
  }

  @Delete('groups/:id')
  @Roles('owner', 'manager')
  deactivateGroup(@Param('id', ParseIntPipe) id: number) {
    return this.modifiers.deactivateGroup(id);
  }

  @Post('groups/:id/options')
  @Roles('owner', 'manager')
  createOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModifierOptionDto,
  ) {
    return this.modifiers.createOption(id, body);
  }

  @Patch('options/:id')
  @Roles('owner', 'manager')
  updateOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModifierOptionDto,
  ) {
    return this.modifiers.updateOption(id, body);
  }

  @Delete('options/:id')
  @Roles('owner', 'manager')
  removeOption(@Param('id', ParseIntPipe) id: number) {
    return this.modifiers.removeOption(id);
  }

  @Get('products/:menuId')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  listProductLinks(@Param('menuId', ParseIntPipe) menuId: number) {
    return this.modifiers.listProductLinks(menuId);
  }

  @Put('products/:menuId')
  @Roles('owner', 'manager')
  setProductLinks(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body('groupIds') groupIds: number[],
  ) {
    if (!Array.isArray(groupIds)) {
      throw new HttpException(
        { status: 'error', message: 'groupIds must be an array' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.modifiers.setProductLinks(menuId, groupIds);
  }
}
