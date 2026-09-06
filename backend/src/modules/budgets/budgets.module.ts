import { Module } from '@nestjs/common';
import { BudgetsService } from './services/budgets.service';
import { BudgetsController } from './controllers/budgets.controller';

@Module({
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
