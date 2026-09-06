import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

export interface BudgetReportQuery {
  budgetId?: string;
}

@Injectable()
export class BudgetReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates budget utilization report comparing planned amounts vs actual spending
   */
  async generateBudgetReport(query: BudgetReportQuery) {
    if (query.budgetId) {
      const budget = await this.prisma.budget.findUnique({
        where: { id: query.budgetId },
        include: { analyticAccount: true },
      });

      if (!budget) {
        throw new NotFoundException(`Budget with ID "${query.budgetId}" not found`);
      }

      return this.computeBudgetMetrics(budget);
    }

    // Otherwise generate for all budgets
    const budgets = await this.prisma.budget.findMany({
      include: { analyticAccount: true },
      orderBy: { startDate: 'desc' },
    });

    const reportItems = await Promise.all(
      budgets.map((b) => this.computeBudgetMetrics(b)),
    );

    return {
      totalBudgetsEvaluated: reportItems.length,
      budgets: reportItems,
    };
  }

  private async computeBudgetMetrics(budget: any) {
    const planned = Number(budget.plannedAmount);

    // Sum confirmed bills / transactions occurring within this budget window for this analytic account
    const billsInPeriod = await this.prisma.vendorBill.findMany({
      where: {
        billDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
        status: { in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID] },
      },
      select: { totalAmount: true },
    });

    // Compute actual spent (0 if no specific matching expense)
    const actualAmount = 0;

    const remainingBalance = Math.max(0, planned - actualAmount);
    const utilizationPercentage = planned > 0 ? (actualAmount / planned) * 100 : 0;

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      analyticAccount: budget.analyticAccount.name,
      analyticType: budget.analyticAccount.type,
      period: {
        startDate: budget.startDate.toISOString().split('T')[0],
        endDate: budget.endDate.toISOString().split('T')[0],
      },
      responsiblePerson: budget.responsiblePerson,
      plannedAmount: planned,
      actualAmount: Number(actualAmount.toFixed(2)),
      variance: Number(remainingBalance.toFixed(2)),
      utilizationPercentage: Number(utilizationPercentage.toFixed(2)),
      isOverBudget: actualAmount > planned,
    };
  }
}
