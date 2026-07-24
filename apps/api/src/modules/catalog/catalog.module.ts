// apps/api/src/modules/catalog/catalog.module.ts
//
// Phase 6A additions:
//   • CategoriesService + CategoriesController
//   • ProductVariantsService
//   • ProductBarcodesService
// Phase 12 additions:
//   • ModifiersService + ModifiersController
//   • RecipesService + RecipesController

import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductBarcodesService } from './product-barcodes.service';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, InventoryModule, AuthModule],
  controllers: [
    CatalogController,
    CategoriesController,
    ModifiersController,
    RecipesController,
  ],
  providers: [
    CatalogService,
    CategoriesService,
    ProductVariantsService,
    ProductBarcodesService,
    ModifiersService,
    RecipesService,
  ],
  exports: [
    CatalogService,
    CategoriesService,
    ProductVariantsService,
    ProductBarcodesService,
    ModifiersService,
    RecipesService,
  ],
})
export class CatalogModule {}
