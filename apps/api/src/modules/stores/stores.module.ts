import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { AdminStoresController, StoresController } from './stores.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StoresController, AdminStoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
