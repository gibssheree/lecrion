import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmAdapterService } from './llm-adapter.service';
import { PromptTemplatesService } from './prompt-templates.service';
import { LlmToolsService } from './llm-tools.service';
import { NutritionAdvisorService } from './nutrition-advisor.service';
import { LlmController } from './llm.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LlmController],
  providers: [
    LlmService,
    LlmAdapterService,
    PromptTemplatesService,
    LlmToolsService,
    NutritionAdvisorService,
  ],
  exports: [LlmService, NutritionAdvisorService],
})
export class LlmModule {}
