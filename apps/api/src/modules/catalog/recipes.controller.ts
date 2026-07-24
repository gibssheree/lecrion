// apps/api/src/modules/catalog/recipes.controller.ts
//
// Endpoints:
//   GET    /api/recipes                  — list all recipes (with cost calc)
//   GET    /api/recipes/menu/:menuId     — recipe for a menu item (or 404)
//   POST   /api/recipes                  — upsert recipe (idempotent on menuId)
//   DELETE /api/recipes/menu/:menuId     — remove recipe

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RecipesService, UpsertRecipeDto } from './recipes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('recipes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  list() {
    return this.recipes.listRecipes();
  }

  @Get('menu/:menuId')
  @Roles('owner', 'manager', 'cashier', 'inventory_staff')
  async getByMenu(@Param('menuId', ParseIntPipe) menuId: number) {
    const recipe = await this.recipes.getRecipeByMenuId(menuId);
    if (!recipe) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return recipe;
  }

  @Post()
  @Roles('owner', 'manager')
  upsert(@Body() body: UpsertRecipeDto) {
    return this.recipes.upsertRecipe(body);
  }

  @Delete('menu/:menuId')
  @Roles('owner', 'manager')
  remove(@Param('menuId', ParseIntPipe) menuId: number) {
    return this.recipes.deleteRecipe(menuId);
  }
}
