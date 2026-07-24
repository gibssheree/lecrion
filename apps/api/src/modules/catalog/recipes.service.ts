// apps/api/src/modules/catalog/recipes.service.ts
//
// RecipesService — manage menu-to-ingredient (BOM) mapping for F&B vertical.
//
// Recipe semantics:
//   • One recipe per menu item (menu_id is unique on the recipes table).
//   • yield_qty = how many servings/units the recipe produces in one prep
//     cycle. Default 1 → ingredient qty is per single serving.
//   • recipe_ingredients.ingredient_menu_id MUST reference a menu row whose
//     product_type = "material" (raw material). The service validates this.
//   • Replacing ingredients is an atomic operation (delete-then-insert in tx).
//
// Cost calculation: hpp = sum(ingredient.qty × ingredient.cost_price) / yield_qty
// Use getRecipeWithCost() to get the precomputed cost.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export interface RecipeIngredientDto {
  ingredientMenuId: number;
  qty: number;
  unitCode?: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpsertRecipeDto {
  menuId: number;
  yieldQty?: number;
  yieldUnit?: string;
  notes?: string;
  isActive?: boolean;
  ingredients: RecipeIngredientDto[];
}

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  async listRecipes() {
    const rows = await this.prisma.recipes.findMany({
      include: {
        menu: { select: { id: true, name: true, sku: true, price: true } },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit_code: true,
                cost_price: true,
              },
            },
          },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: { id: 'desc' },
    });

    return rows.map((row) => this.normalizeRecipe(row));
  }

  async getRecipeByMenuId(menuId: number) {
    const row = await this.prisma.recipes.findUnique({
      where: { menu_id: menuId },
      include: {
        menu: { select: { id: true, name: true, sku: true, price: true } },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit_code: true,
                cost_price: true,
              },
            },
          },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        },
      },
    });
    return row ? this.normalizeRecipe(row) : null;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Idempotent upsert for a menu's recipe.
   *
   * Behaviour:
   *   • If no recipe exists for menuId → create with ingredients.
   *   • If recipe exists → update meta + replace ingredient lines atomically.
   *
   * Constraints:
   *   • menuId must be a valid menu row.
   *   • Each ingredientMenuId must reference a menu row with
   *     product_type = "material".
   *   • Cannot use the same menu as both recipe target and ingredient.
   */
  async upsertRecipe(dto: UpsertRecipeDto) {
    if (!dto.menuId) throw new BadRequestException('menuId is required');
    if (!Array.isArray(dto.ingredients) || dto.ingredients.length === 0) {
      throw new BadRequestException('At least one ingredient is required');
    }

    const targetMenu = await this.prisma.menu.findUnique({
      where: { id: dto.menuId },
    });
    if (!targetMenu) {
      throw new NotFoundException(`Menu #${dto.menuId} not found`);
    }

    // Validate ingredient products
    const ingredientIds = Array.from(
      new Set(dto.ingredients.map((line) => line.ingredientMenuId)),
    );
    if (ingredientIds.includes(dto.menuId)) {
      throw new BadRequestException('A menu item cannot be its own ingredient');
    }

    const ingredients = await this.prisma.menu.findMany({
      where: { id: { in: ingredientIds } },
    });
    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException(
        'One or more ingredient products do not exist',
      );
    }
    const nonMaterial = ingredients.find(
      (item) => item.product_type !== 'material',
    );
    if (nonMaterial) {
      throw new BadRequestException(
        `Product "${nonMaterial.name}" is not a raw material (product_type must be "material")`,
      );
    }

    const now = new Date().toISOString();

    return this.prisma
      .$transaction(async (tx) => {
        const existing = await tx.recipes.findUnique({
          where: { menu_id: dto.menuId },
        });

        let recipeId: number;
        if (existing) {
          await tx.recipes.update({
            where: { id: existing.id },
            data: {
              yield_qty: dto.yieldQty ?? existing.yield_qty,
              yield_unit: dto.yieldUnit ?? existing.yield_unit,
              notes: dto.notes ?? existing.notes,
              is_active: dto.isActive ?? existing.is_active,
              updated_at: now,
            },
          });
          recipeId = existing.id;
          await tx.recipe_ingredients.deleteMany({
            where: { recipe_id: existing.id },
          });
        } else {
          const created = await tx.recipes.create({
            data: {
              menu_id: dto.menuId,
              yield_qty: dto.yieldQty ?? 1,
              yield_unit: dto.yieldUnit ?? null,
              notes: dto.notes ?? null,
              is_active: dto.isActive ?? true,
              created_at: now,
              updated_at: now,
            },
          });
          recipeId = created.id;
        }

        for (const [index, line] of dto.ingredients.entries()) {
          if (!Number.isFinite(line.qty) || line.qty <= 0) {
            throw new BadRequestException(
              'Ingredient qty must be a positive number',
            );
          }
          await tx.recipe_ingredients.create({
            data: {
              recipe_id: recipeId,
              ingredient_menu_id: line.ingredientMenuId,
              qty: line.qty,
              unit_code: line.unitCode ?? null,
              notes: line.notes ?? null,
              sort_order: line.sortOrder ?? index,
              created_at: now,
            },
          });
        }

        return recipeId;
      })
      .then((recipeId) =>
        this.prisma.recipes
          .findUnique({
            where: { id: recipeId },
            include: {
              menu: {
                select: { id: true, name: true, sku: true, price: true },
              },
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      name: true,
                      unit_code: true,
                      cost_price: true,
                    },
                  },
                },
                orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
              },
            },
          })
          .then((row) => this.normalizeRecipe(row!)),
      );
  }

  async deleteRecipe(menuId: number) {
    const existing = await this.prisma.recipes.findUnique({
      where: { menu_id: menuId },
    });
    if (!existing) throw new NotFoundException(`No recipe for menu ${menuId}`);
    await this.prisma.recipes.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private normalizeRecipe(row: any) {
    const ingredients = (row.ingredients ?? []).map((line: any) => ({
      id: line.id,
      ingredientMenuId: line.ingredient_menu_id,
      ingredientName: line.ingredient?.name ?? `#${line.ingredient_menu_id}`,
      qty: Number(line.qty),
      unitCode: line.unit_code ?? line.ingredient?.unit_code ?? null,
      unitCost: line.ingredient?.cost_price
        ? Number(line.ingredient.cost_price)
        : null,
      lineCost: line.ingredient?.cost_price
        ? Number(line.qty) * Number(line.ingredient.cost_price)
        : null,
      notes: line.notes ?? null,
      sortOrder: line.sort_order,
    }));

    const totalCost = ingredients.reduce(
      (sum: number, line: any) => sum + (line.lineCost ?? 0),
      0,
    );
    const yieldQty = Number(row.yield_qty ?? 1) || 1;

    return {
      id: row.id,
      menuId: row.menu_id,
      menuName: row.menu?.name ?? `#${row.menu_id}`,
      menuSku: row.menu?.sku ?? null,
      menuPrice: row.menu?.price ? Number(row.menu.price) : null,
      yieldQty,
      yieldUnit: row.yield_unit ?? null,
      notes: row.notes ?? null,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ingredients,
      totalCost,
      hpp: totalCost / yieldQty,
    };
  }
}
