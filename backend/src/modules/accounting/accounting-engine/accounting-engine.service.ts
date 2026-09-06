import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, JournalType, AccountType, PaymentMethod } from '@prisma/client';

export interface JournalEntryLineItem {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  journalType: JournalType;
  reference: string;
  lines: JournalEntryLineItem[];
  date?: Date;
  prismaTx?: Prisma.TransactionClient;
}

@Injectable()
export class AccountingEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to ensure Total Debit === Total Credit before persisting.
   */
  private validateBalance(lines: JournalEntryLineItem[]): void {
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    // Using float precision tolerance of 0.001
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Unbalanced Journal Entry: Total Debit (${totalDebit.toFixed(2)}) does not equal Total Credit (${totalCredit.toFixed(2)})`,
      );
    }
  }

  /**
   * Create a balanced journal entry in database.
   */
  async createJournalEntry(input: CreateJournalEntryInput) {
    this.validateBalance(input.lines);

    const client = input.prismaTx || this.prisma;

    // Find the journal by type
    const journal = await client.journal.findFirst({
      where: { type: input.journalType },
    });

    if (!journal) {
      throw new InternalServerErrorException(
        `Journal configuration for type "${input.journalType}" not found in database`,
      );
    }

    const entryNumber = `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return client.journalEntry.create({
      data: {
        entryNumber,
        reference: input.reference,
        date: input.date || new Date(),
        journalId: journal.id,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description || input.reference,
          })),
        },
      },
      include: {
        lines: {
          include: { account: true },
        },
        journal: true,
      },
    });
  }

  /**
   * Helper to resolve standard seeded accounts by name
   */
  async getAccountByName(name: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;

    // 1. Direct match
    let account = await client.account.findUnique({
      where: { name },
    });
    if (account) return account;

    // 2. Standard aliases mapping to seeded Chart of Accounts
    const ALIAS_MAP: Record<string, string[]> = {
      Bank: ['State Bank of India – Current A/c', 'HDFC Bank – Business A/c', 'HDFC Bank – Current Account', 'Bank'],
      Cash: ['Cash on Hand', 'Petty Cash', 'Cash'],
      Debtors: ['Accounts Receivable (Debtors)', 'Accounts Receivable', 'Trade Debtors', 'Debtors'],
      Creditors: ['Accounts Payable (Creditors)', 'Accounts Payable', 'Trade Creditors', 'Creditors'],
      'Sales Income': ['Furniture Sales Revenue', 'Design & Installation Services Income', 'Sales Income', 'Sales Revenue'],
      'Purchase Expense': ['Timber & Raw Material Purchases', 'Purchase Expense', 'Cost of Goods Sold'],
    };

    const candidates = ALIAS_MAP[name] || [name];
    for (const cand of candidates) {
      account = await client.account.findFirst({
        where: {
          OR: [
            { name: { equals: cand, mode: 'insensitive' } },
            { name: { contains: cand, mode: 'insensitive' } },
          ],
        },
      });
      if (account) return account;
    }

    // 3. Fallback to code
    const codeMap: Record<string, string[]> = {
      Bank: ['1002', '1003'],
      Cash: ['1001'],
      Debtors: ['1100'],
      Creditors: ['2100'],
      'Sales Income': ['4000', '4100'],
      'Purchase Expense': ['5000'],
    };
    if (codeMap[name]) {
      account = await client.account.findFirst({
        where: { code: { in: codeMap[name] } },
      });
      if (account) return account;
    }

    throw new InternalServerErrorException(
      `Standard account "${name}" not found. Please ensure database is seeded.`,
    );
  }

  /**
   * Event 1: Confirm Customer Invoice
   * Debit: Debtors, Credit: Sales Income
   */
  async recordCustomerInvoiceConfirmed(
    invoice: { id: string; invoiceNumber: string; totalAmount: number },
    tx?: Prisma.TransactionClient,
  ) {
    const debtorsAccount = await this.getAccountByName('Debtors', tx);
    const salesIncomeAccount = await this.getAccountByName('Sales Income', tx);

    const amount = Number(invoice.totalAmount);

    return this.createJournalEntry({
      journalType: JournalType.SALES,
      reference: `Invoice Confirmed: ${invoice.invoiceNumber}`,
      prismaTx: tx,
      lines: [
        {
          accountId: debtorsAccount.id,
          debit: amount,
          credit: 0,
          description: `Receivable from invoice ${invoice.invoiceNumber}`,
        },
        {
          accountId: salesIncomeAccount.id,
          debit: 0,
          credit: amount,
          description: `Sales revenue for invoice ${invoice.invoiceNumber}`,
        },
      ],
    });
  }

  /**
   * Event 2: Confirm Vendor Bill
   * Debit: Purchase Expense, Credit: Creditors
   */
  async recordVendorBillConfirmed(
    bill: { id: string; billNumber: string; totalAmount: number },
    tx?: Prisma.TransactionClient,
  ) {
    const purchaseExpenseAccount = await this.getAccountByName('Purchase Expense', tx);
    const creditorsAccount = await this.getAccountByName('Creditors', tx);

    const amount = Number(bill.totalAmount);

    return this.createJournalEntry({
      journalType: JournalType.PURCHASE,
      reference: `Bill Confirmed: ${bill.billNumber}`,
      prismaTx: tx,
      lines: [
        {
          accountId: purchaseExpenseAccount.id,
          debit: amount,
          credit: 0,
          description: `Purchase expense for bill ${bill.billNumber}`,
        },
        {
          accountId: creditorsAccount.id,
          debit: 0,
          credit: amount,
          description: `Payable to vendor for bill ${bill.billNumber}`,
        },
      ],
    });
  }

  /**
   * Event 3: Record Customer Payment
   * Debit: Cash/Bank, Credit: Debtors
   */
  async recordCustomerPayment(
    payment: {
      paymentNumber: string;
      amount: number;
      method: PaymentMethod;
      invoiceNumber?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const targetAccountName = payment.method === PaymentMethod.CASH ? 'Cash' : 'Bank';
    const moneyAccount = await this.getAccountByName(targetAccountName, tx);
    const debtorsAccount = await this.getAccountByName('Debtors', tx);

    const amount = Number(payment.amount);
    const journalType = payment.method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK;

    return this.createJournalEntry({
      journalType,
      reference: `Payment ${payment.paymentNumber} against Invoice ${payment.invoiceNumber || ''}`,
      prismaTx: tx,
      lines: [
        {
          accountId: moneyAccount.id,
          debit: amount,
          credit: 0,
          description: `Customer payment received in ${targetAccountName}`,
        },
        {
          accountId: debtorsAccount.id,
          debit: 0,
          credit: amount,
          description: `Settlement of receivable for invoice ${payment.invoiceNumber || ''}`,
        },
      ],
    });
  }

  /**
   * Event 4: Record Vendor Payment
   * Debit: Creditors, Credit: Cash/Bank
   */
  async recordVendorPayment(
    payment: {
      paymentNumber: string;
      amount: number;
      method: PaymentMethod;
      billNumber?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const targetAccountName = payment.method === PaymentMethod.CASH ? 'Cash' : 'Bank';
    const moneyAccount = await this.getAccountByName(targetAccountName, tx);
    const creditorsAccount = await this.getAccountByName('Creditors', tx);

    const amount = Number(payment.amount);
    const journalType = payment.method === PaymentMethod.CASH ? JournalType.CASH : JournalType.BANK;

    return this.createJournalEntry({
      journalType,
      reference: `Vendor Payment ${payment.paymentNumber} against Bill ${payment.billNumber || ''}`,
      prismaTx: tx,
      lines: [
        {
          accountId: creditorsAccount.id,
          debit: amount,
          credit: 0,
          description: `Payable settlement for bill ${payment.billNumber || ''}`,
        },
        {
          accountId: moneyAccount.id,
          debit: 0,
          credit: amount,
          description: `Funds deducted from ${targetAccountName}`,
        },
      ],
    });
  }

  /**
   * Event 5: Reverse / Cancel Customer Invoice
   * Reversal: Debit Sales Income, Credit Debtors
   */
  async recordCustomerInvoiceCancelled(
    invoice: { id: string; invoiceNumber: string; totalAmount: number },
    tx?: Prisma.TransactionClient,
  ) {
    const debtorsAccount = await this.getAccountByName('Debtors', tx);
    const salesIncomeAccount = await this.getAccountByName('Sales Income', tx);

    const amount = Number(invoice.totalAmount);

    return this.createJournalEntry({
      journalType: JournalType.SALES,
      reference: `Invoice Reversal / Cancelled: ${invoice.invoiceNumber}`,
      prismaTx: tx,
      lines: [
        {
          accountId: salesIncomeAccount.id,
          debit: amount,
          credit: 0,
          description: `Reversal of revenue for cancelled invoice ${invoice.invoiceNumber}`,
        },
        {
          accountId: debtorsAccount.id,
          debit: 0,
          credit: amount,
          description: `Reversal of receivable for cancelled invoice ${invoice.invoiceNumber}`,
        },
      ],
    });
  }

  /**
   * Event 6: Reverse / Cancel Vendor Bill
   * Reversal: Debit Creditors, Credit Purchase Expense
   */
  async recordVendorBillCancelled(
    bill: { id: string; billNumber: string; totalAmount: number },
    tx?: Prisma.TransactionClient,
  ) {
    const purchaseExpenseAccount = await this.getAccountByName('Purchase Expense', tx);
    const creditorsAccount = await this.getAccountByName('Creditors', tx);

    const amount = Number(bill.totalAmount);

    return this.createJournalEntry({
      journalType: JournalType.PURCHASE,
      reference: `Bill Reversal / Cancelled: ${bill.billNumber}`,
      prismaTx: tx,
      lines: [
        {
          accountId: creditorsAccount.id,
          debit: amount,
          credit: 0,
          description: `Reversal of payable for cancelled bill ${bill.billNumber}`,
        },
        {
          accountId: purchaseExpenseAccount.id,
          debit: 0,
          credit: amount,
          description: `Reversal of purchase expense for cancelled bill ${bill.billNumber}`,
        },
      ],
    });
  }
}

