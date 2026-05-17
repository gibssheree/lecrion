// apps/api/src/modules/catalog/catalog.module.ts
//
// Phase 6A additions:
//   • CategoriesService + CategoriesController
//   • ProductVariantsService
//   • ProductBarcodesService

import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductBarcodesService } from './product-barcodes.service';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, InventoryModule, AuthModule],
  controllers: [CatalogController, CategoriesController],
  providers: [
    CatalogService,
    CategoriesService,
    ProductVariantsService,
    ProductBarcodesService,
  ],
  exports: [
    CatalogService,
    CategoriesService,
    ProductVariantsService,
    ProductBarcodesService,
  ],
})
export class CatalogModule {}
