import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingEngineService } from '../../accounting/accounting-engine/accounting-engine.service';
import { RecordCustomerPaymentDto } from '../dto/record-customer-payment.dto';
import { RecordVendorPaymentDto } from '../dto/record-vendor-payment.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { PaymentType, TransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
  ) { }

  /**
   * Settle Customer Invoice Payment:
   * 1. Check Invoice & remaining balance
   * 2. Increment paidAmount, set status to PAID if fully settled
   * 3. Record Payment record
   * 4. Double entry journal: Debit Cash/Bank, Credit Debtors
   * Atomically handled
   */
  async recordCustomerPayment(dto: RecordCustomerPaymentDto, currentUser?: any) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { id: dto.customerInvoiceId },
      include: { customer: true, lines: { include: { product: true } } },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Customer invoice with ID "${dto.customerInvoiceId}" not found`,
      );
    }

    if (currentUser?.role === 'CONTACT_USER' && currentUser?.contactId) {
      if (invoice.customerId !== currentUser.contactId) {
        throw new ForbiddenException('You can only make payments for your own invoices');
      }
    }

    if (invoice.status === TransactionStatus.PAID) {
      throw new BadRequestException(`Invoice "${invoice.invoiceNumber}" is already fully paid`);
    }

    const currentPaid = Number(invoice.paidAmount);
    const totalAmount = Number(invoice.totalAmount);
    const paymentAmount = Number(dto.amount);
    const remainingDue = totalAmount - currentPaid;

    if (paymentAmount > remainingDue + 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) exceeds remaining due amount (${remainingDue.toFixed(2)}) for invoice "${invoice.invoiceNumber}"`,
      );
    }

    // Generate sequential payment number (e.g. PAY-2026-001, PAY-2026-003...)
    const year = new Date().getFullYear();
    const latestPay = await this.prisma.payment.findFirst({
      where: { paymentNumber: { startsWith: `PAY-${year}-` } },
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });
    let nextNum = 1;
    if (latestPay?.paymentNumber) {
      const parts = latestPay.paymentNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let paymentNumber = `PAY-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.payment.findUnique({ where: { paymentNumber } })) {
      nextNum++;
      paymentNumber = `PAY-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const newPaidAmount = currentPaid + paymentAmount;
      const isFullyPaid = newPaidAmount >= totalAmount - 0.01;

      // Decrement stock if invoice was still in DRAFT
      if (invoice.status === TransactionStatus.DRAFT) {
        for (const line of invoice.lines) {
          if (line.product.type === ProductType.GOODS) {
            await tx.product.update({
              where: { id: line.productId },
              data: {
                stockQuantity: {
                  decrement: line.quantity,
                },
              },
            });
          }
        }
      }

      // Update invoice
      await tx.customerInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? TransactionStatus.PAID : TransactionStatus.PARTIALLY_PAID,
        },
      });

      // Create Payment entry
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          type: PaymentType.CUSTOMER_PAYMENT,
          paymentMethod: dto.paymentMethod,
          amount: paymentAmount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          reference: dto.reference || null,
          contactId: invoice.customerId,
          customerInvoiceId: invoice.id,
        },
        include: {
          contact: true,
          customerInvoice: true,
        },
      });

      // Generate balanced journal entry
      await this.accountingEngine.recordCustomerPayment(
        {
          paymentNumber: payment.paymentNumber,
          amount: paymentAmount,
          method: dto.paymentMethod,
          invoiceNumber: invoice.invoiceNumber,
        },
        tx,
      );

      return payment;
    });
  }

  /**
   * Settle Vendor Bill Payment:
   * 1. Check Bill & remaining balance
   * 2. Increment paidAmount, set status to PAID if fully settled, or PARTIALLY_PAID
   * 3. Record Payment record
   * 4. Double entry journal: Debit Creditors, Credit Cash/Bank
   * Atomically handled
   */
  async recordVendorPayment(dto: RecordVendorPaymentDto) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id: dto.vendorBillId },
      include: { vendor: true, lines: { include: { product: true } } },
    });

    if (!bill) {
      throw new NotFoundException(
        `Vendor bill with ID "${dto.vendorBillId}" not found`,
      );
    }

    if (bill.status === TransactionStatus.PAID) {
      throw new BadRequestException(`Vendor bill "${bill.billNumber}" is already fully paid`);
    }

    const currentPaid = Number(bill.paidAmount);
    const totalAmount = Number(bill.totalAmount);
    const paymentAmount = Number(dto.amount);
    const remainingDue = totalAmount - currentPaid;

    if (paymentAmount > remainingDue + 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) exceeds remaining due amount (${remainingDue.toFixed(2)}) for bill "${bill.billNumber}"`,
      );
    }

    // Generate sequential payment number (e.g. PAY-2026-001, PAY-2026-003...)
    const year = new Date().getFullYear();
    const latestPay = await this.prisma.payment.findFirst({
      where: { paymentNumber: { startsWith: `PAY-${year}-` } },
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });
    let nextNum = 1;
    if (latestPay?.paymentNumber) {
      const parts = latestPay.paymentNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let paymentNumber = `PAY-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.payment.findUnique({ where: { paymentNumber } })) {
      nextNum++;
      paymentNumber = `PAY-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const newPaidAmount = currentPaid + paymentAmount;
      const isFullyPaid = newPaidAmount >= totalAmount - 0.01;

      // Increment stock if bill was still in DRAFT
      if (bill.status === TransactionStatus.DRAFT) {
        for (const line of bill.lines) {
          if (line.product.type === ProductType.GOODS) {
            await tx.product.update({
              where: { id: line.productId },
              data: {
                stockQuantity: {
                  increment: line.quantity,
                },
              },
            });
          }
        }
      }

      // Update bill
      await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? TransactionStatus.PAID : TransactionStatus.PARTIALLY_PAID,
        },
      });

      // Create Payment entry
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          type: PaymentType.VENDOR_PAYMENT,
          paymentMethod: dto.paymentMethod,
          amount: paymentAmount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          reference: dto.reference || null,
          contactId: bill.vendorId,
          vendorBillId: bill.id,
        },
        include: {
          contact: true,
          vendorBill: true,
        },
      });

      // Generate balanced journal entry
      await this.accountingEngine.recordVendorPayment(
        {
          paymentNumber: payment.paymentNumber,
          amount: paymentAmount,
          method: dto.paymentMethod,
          billNumber: bill.billNumber,
        },
        tx,
      );

      return payment;
    });
  }

  async findAll(query: PaginationQueryDto, type?: PaymentType, currentUser?: any) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;

    // Contact user scoping
    if (currentUser?.role === 'CONTACT_USER' && currentUser?.contactId) {
      where.contactId = currentUser.contactId;
    }

    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          contact: true,
          customerInvoice: true,
          vendorBill: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit) || 1,
        currentPage: page,
      },
    };
  }

  async findById(id: string, currentUser?: any) {
    const where: any = { id };
    if (currentUser?.role === 'CONTACT_USER' && currentUser?.contactId) {
      where.contactId = currentUser.contactId;
    }

    const payment = await this.prisma.payment.findFirst({
      where,
      include: {
        contact: true,
        customerInvoice: true,
        vendorBill: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    return payment;
  }
}
