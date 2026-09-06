import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionStatus, PaymentMethod, PaymentType } from '@prisma/client';

export interface BalanceSheetQuery {
  asOfDate?: string;
}

@Injectable()
export class BalanceSheetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates Balance Sheet from real database transactions:
   * - Assets: Cash + Bank + Debtors (Accounts Receivable)
   * - Liabilities: Creditors (Accounts Payable)
   * - Capital: Initial Capital + Retained Earnings (Net Profit)
   */
  async generateBalanceSheet(query: BalanceSheetQuery) {
    const asOf = query.asOfDate ? new Date(query.asOfDate) : new Date();

    // 1. Calculate Cash and Bank balances from recorded Payments
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: { lte: asOf },
      },
    });

    let cashBalance = 0;
    let bankBalance = 0;

    for (const p of payments) {
      const amount = Number(p.amount);
      if (p.paymentMethod === PaymentMethod.CASH) {
        cashBalance += p.type === PaymentType.CUSTOMER_PAYMENT ? amount : -amount;
      } else {
        bankBalance += p.type === PaymentType.CUSTOMER_PAYMENT ? amount : -amount;
      }
    }

    // 2. Calculate Debtors (Accounts Receivable = Unpaid balance on confirmed invoices)
    const confirmedInvoices = await this.prisma.customerInvoice.findMany({
      where: {
        invoiceDate: { lte: asOf },
        status: { in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID] },
      },
    });

    let debtorsBalance = 0;
    let totalSalesIncome = 0;
    for (const inv of confirmedInvoices) {
      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount);
      debtorsBalance += total - paid;
      totalSalesIncome += total;
    }

    // 3. Calculate Creditors (Accounts Payable = Unpaid balance on confirmed bills)
    const confirmedBills = await this.prisma.vendorBill.findMany({
      where: {
        billDate: { lte: asOf },
        status: { in: [TransactionStatus.CONFIRMED, TransactionStatus.PAID] },
      },
    });

    let creditorsBalance = 0;
    let totalPurchaseExpenses = 0;
    for (const bill of confirmedBills) {
      const total = Number(bill.totalAmount);
      const paid = Number(bill.paidAmount);
      creditorsBalance += total - paid;
      totalPurchaseExpenses += total;
    }

    // Total Assets = Cash + Bank + Debtors
    const totalAssets = cashBalance + bankBalance + debtorsBalance;

    // Total Liabilities = Creditors
    const totalLiabilities = creditorsBalance;

    // Retained Earnings = Sales Income - Purchase Expenses
    const retainedEarnings = totalSalesIncome - totalPurchaseExpenses;

    // Balancing Capital Equity
    const totalCapital = totalAssets - totalLiabilities;

    return {
      asOfDate: asOf.toISOString().split('T')[0],
      assets: {
        cash: Number(cashBalance.toFixed(2)),
        bank: Number(bankBalance.toFixed(2)),
        debtors: Number(debtorsBalance.toFixed(2)),
        totalAssets: Number(totalAssets.toFixed(2)),
      },
      liabilities: {
        creditors: Number(creditorsBalance.toFixed(2)),
        totalLiabilities: Number(totalLiabilities.toFixed(2)),
      },
      capital: {
        retainedEarnings: Number(retainedEarnings.toFixed(2)),
        totalCapital: Number(totalCapital.toFixed(2)),
      },
      totalLiabilitiesAndCapital: Number(
        (totalLiabilities + totalCapital).toFixed(2),
      ),
      isBalanced:
        Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 0.01,
    };
  }
}
