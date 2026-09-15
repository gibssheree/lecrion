import { Module } from '@nestjs/common';
import { AccommodationController } from './accommodation.controller';
import { AccommodationService } from './accommodation.service';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [StoresModule],
  controllers: [AccommodationController],
  providers: [AccommodationService, ModuleCapabilityGuard],
  exports: [AccommodationService],
})
export class AccommodationModule {}
