import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { LoyaltyService } from './loyalty.service';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, LoyaltyService, PromotionsService],
  exports: [CustomersService, LoyaltyService, PromotionsService],
})
export class CustomersModule {}
