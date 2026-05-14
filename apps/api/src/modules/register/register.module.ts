import { Module } from '@nestjs/common';
import { RegisterService } from './register.service';
import { RegisterController } from './register.controller';
import { CashflowModule } from '../cashflow/cashflow.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CashflowModule, AuthModule],
  controllers: [RegisterController],
  providers: [RegisterService],
  exports: [RegisterService],
})
export class RegisterModule {}
