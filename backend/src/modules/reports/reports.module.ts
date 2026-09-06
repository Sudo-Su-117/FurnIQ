import { Module } from '@nestjs/common';
import { ProfitLossService } from './services/profit-loss.service';
import { BalanceSheetService } from './services/balance-sheet.service';
import { BudgetReportService } from './services/budget-report.service';
import { ReportsController } from './controllers/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ProfitLossService, BalanceSheetService, BudgetReportService],
  exports: [ProfitLossService, BalanceSheetService, BudgetReportService],
})
export class ReportsModule {}
