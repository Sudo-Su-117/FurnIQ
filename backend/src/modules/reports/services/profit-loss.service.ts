import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionStatus } from '@prisma/client';

export interface ProfitLossQuery {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class ProfitLossService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * P&L = Sales Income - Purchase Expenses
   * Aggregated from confirmed/paid customer invoices and vendor bills
   */
  async generateProfitLoss(query: ProfitLossQuery) {
    const invoiceWhere: any = {
      status: { in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID] },
    };

    const billWhere: any = {
      status: { in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID] },
    };

    if (query.startDate || query.endDate) {
      invoiceWhere.invoiceDate = {};
      billWhere.billDate = {};

      if (query.startDate) {
        invoiceWhere.invoiceDate.gte = new Date(query.startDate);
        billWhere.billDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        invoiceWhere.invoiceDate.lte = new Date(query.endDate);
        billWhere.billDate.lte = new Date(query.endDate);
      }
    }

    // 1. Calculate Total Sales Income
    const invoices = await this.prisma.customerInvoice.findMany({
      where: invoiceWhere,
      select: { totalAmount: true },
    });
    const salesIncome = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0),
      0,
    );

    // 2. Calculate Total Purchase Expenses
    const bills = await this.prisma.vendorBill.findMany({
      where: billWhere,
      select: { totalAmount: true },
    });
    const purchaseExpenses = bills.reduce(
      (sum, bill) => sum + Number(bill.totalAmount || 0),
      0,
    );

    // 3. Compute Net Profit = Sales - Purchases
    const netProfit = salesIncome - purchaseExpenses;

    return {
      period: {
        startDate: query.startDate || 'All Time',
        endDate: query.endDate || 'Present',
      },
      summary: {
        totalConfirmedInvoicesCount: invoices.length,
        totalConfirmedBillsCount: bills.length,
      },
      income: {
        salesIncome: Number(salesIncome.toFixed(2)),
        totalIncome: Number(salesIncome.toFixed(2)),
      },
      expenses: {
        purchaseExpenses: Number(purchaseExpenses.toFixed(2)),
        totalExpenses: Number(purchaseExpenses.toFixed(2)),
      },
      netProfit: Number(netProfit.toFixed(2)),
      isProfitable: netProfit >= 0,
    };
  }
}
