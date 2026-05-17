// apps/api/src/modules/catalog/categories.controller.ts
//
// CategoriesController — product category management API.
//
// Endpoints:
//   GET    /api/categories              – flat list (active only by default)
//   GET    /api/categories/tree         – nested tree
//   GET    /api/categories/:id          – single category
//   POST   /api/categories              – create category
//   PATCH  /api/categories/:id          – update category
//   DELETE /api/categories/:id          – soft-delete (deactivate)
//
// Query params for GET /api/categories:
//   storeId         – filter by store (default: "default-store")
//   includeInactive – "true" to include inactive categories

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
} from '@nestjs/common';
import {
  CategoriesService,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── GET /api/categories ────────────────────────────────────────────────────
  @Get()
  async getCategories(
    @Query('storeId') storeId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    const store = storeId || 'default-store';
    const showAll = includeInactive === 'true';
    const categories = await this.categoriesService.getFlat(store, showAll);
    return { categories };
  }

  // ── GET /api/categories/tree ───────────────────────────────────────────────
  @Get('tree')
  async getCategoryTree(
    @Query('storeId') storeId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    const store = storeId || 'default-store';
    const showAll = includeInactive === 'true';
    const tree = await this.categoriesService.getTree(store, showAll);
    return { tree };
  }

  // ── GET /api/categories/:id ────────────────────────────────────────────────
  @Get(':id')
  async getCategoryById(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const category = await this.categoriesService.getById(id);
    if (!category) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { category };
  }

  // ── POST /api/categories ───────────────────────────────────────────────────
  @Post()
  async createCategory(@Body() body: CreateCategoryDto) {
    if (!body?.name?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'name is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const category = await this.categoriesService.create(body);
      return { status: 'created', category };
    } catch (err: any) {
      if (err?.status === 409 || err?.name === 'ConflictException') {
        throw new HttpException(
          { status: 'conflict', message: err.message },
          HttpStatus.CONFLICT,
        );
      }
      if (err?.status === 404 || err?.name === 'NotFoundException') {
        throw new HttpException(
          { status: 'not_found', message: err.message },
          HttpStatus.NOT_FOUND,
        );
      }
      throw err;
    }
  }

  // ── PATCH /api/categories/:id ──────────────────────────────────────────────
  @Patch(':id')
  async updateCategory(
    @Param('id') idParam: string,
    @Body() body: UpdateCategoryDto,
  ) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    try {
      const category = await this.categoriesService.update(id, body);
      if (!category) {
        throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
      }
      return { status: 'updated', category };
    } catch (err: any) {
      if (err?.status === 409 || err?.name === 'ConflictException') {
        throw new HttpException(
          { status: 'conflict', message: err.message },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  // ── DELETE /api/categories/:id ─────────────────────────────────────────────
  // Soft-delete only — sets is_active = false.
  @Delete(':id')
  async deactivateCategory(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    const category = await this.categoriesService.deactivate(id);
    if (!category) {
      throw new HttpException({ status: 'not_found' }, HttpStatus.NOT_FOUND);
    }
    return { status: 'deactivated', category };
  }
}
