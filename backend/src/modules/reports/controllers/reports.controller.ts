import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProfitLossService } from '../services/profit-loss.service';
import { BalanceSheetService } from '../services/balance-sheet.service';
import { BudgetReportService } from '../services/budget-report.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/reports')
export class ReportsController {
  constructor(
    private readonly profitLossService: ProfitLossService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly budgetReportService: BudgetReportService,
  ) {}

  @Public()
  @Get('profit-loss')
  @ApiOperation({
    summary: 'Generate Profit & Loss (P&L) statement (Sales - Purchases) (Public)',
  })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'P&L report generated successfully' })
  async getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.profitLossService.generateProfitLoss({ startDate, endDate });
  }

  @Public()
  @Get('balance-sheet')
  @ApiOperation({
    summary: 'Generate Balance Sheet (Assets, Liabilities, Capital) (Public)',
  })
  @ApiQuery({ name: 'asOfDate', required: false, example: '2026-09-05' })
  @ApiResponse({ status: 200, description: 'Balance sheet generated successfully' })
  async getBalanceSheet(@Query('asOfDate') asOfDate?: string) {
    return this.balanceSheetService.generateBalanceSheet({ asOfDate });
  }

  @Public()
  @Get('budget')
  @ApiOperation({
    summary: 'Generate Budget Performance and Variance Report (Public)',
  })
  @ApiQuery({ name: 'budgetId', required: false, description: 'Optional specific budget ID' })
  @ApiResponse({ status: 200, description: 'Budget report generated successfully' })
  async getBudgetReport(@Query('budgetId') budgetId?: string) {
    return this.budgetReportService.generateBudgetReport({ budgetId });
  }
}
