import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCustomerInvoiceDto } from '../dto/create-customer-invoice.dto';
import { AccountingEngineService } from '../../accounting/accounting-engine/accounting-engine.service';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TransactionStatus, ProductType } from '@prisma/client';

@Injectable()
export class CustomerInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
  ) { }

  async create(dto: CreateCustomerInvoiceDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Customer invoice must contain at least one line item');
    }

    const customer = await this.prisma.contact.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
    }

    // Generate sequential invoice number matching seeder template (e.g. INV-2026-001, INV-2026-003...)
    const year = new Date().getFullYear();
    const latest = await this.prisma.customerInvoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${year}-` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    let nextNum = 1;
    if (latest?.invoiceNumber) {
      const parts = latest.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let invoiceNumber = `INV-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.customerInvoice.findUnique({ where: { invoiceNumber } })) {
      nextNum++;
      invoiceNumber = `INV-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    let untaxedSubtotal = 0;
    const linesData = dto.lines.map((line) => {
      const lineSubtotal = line.quantity * line.unitPrice;
      const tax = line.tax || lineSubtotal * 0.18;
      const lineTotal = lineSubtotal;
      untaxedSubtotal += lineSubtotal;
      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        tax,
        total: lineTotal,
      };
    });
    const totalAmount = Number((untaxedSubtotal * 1.18).toFixed(2));

    return this.prisma.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId: dto.customerId,
        salesOrderId: dto.salesOrderId || null,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: TransactionStatus.DRAFT,
        totalAmount,
        paidAmount: 0,
        lines: {
          create: linesData,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
        salesOrder: true,
      },
    });
  }

  async createFromSO(salesOrderId: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { lines: true },
    });

    if (!so) {
      throw new NotFoundException(`Sales order with ID "${salesOrderId}" not found`);
    }

    const existingInvoice = await this.prisma.customerInvoice.findFirst({
      where: { salesOrderId },
      include: {
        customer: true,
        lines: { include: { product: true } },
        salesOrder: true,
      },
    });
    if (existingInvoice) {
      return existingInvoice;
    }

    return this.create({
      customerId: so.customerId,
      salesOrderId: so.id,
      lines: so.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        tax: Number(l.tax || 0),
      })),
    });
  }

  async findAll(
    query: PaginationQueryDto & {
      status?: TransactionStatus;
      customerId?: string;
      startDate?: string;
      endDate?: string;
    },
    currentUser?: any,
  ) {
    const { page = 1, limit = 10, search, status, customerId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    // Contact user scoping
    if (currentUser?.role === 'CONTACT_USER' && currentUser?.contactId) {
      where.customerId = currentUser.contactId;
    }

    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.customerInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          lines: { include: { product: true } },
          payments: true,
        },
      }),
      this.prisma.customerInvoice.count({ where }),
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
      where.customerId = currentUser.contactId;
    }

    const invoice = await this.prisma.customerInvoice.findFirst({
      where,
      include: {
        customer: true,
        lines: { include: { product: true } },
        salesOrder: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Customer invoice with ID "${id}" not found`);
    }

    return invoice;
  }

  /**
   * Confirm Customer Invoice:
   * 1. Validate stock availability (Prevent negative stock for GOODS)
   * 2. Status -> CONFIRMED
   * 3. Stock Decrease for GOODS products
   * 4. Double-entry accounting entry (Debit: Debtors, Credit: Sales Income)
   * Handled atomically via Prisma $transaction
   */
  async confirm(id: string) {
    const invoice = await this.findById(id);

    if (invoice.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(`Customer invoice is already ${invoice.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Stock validation for GOODS
      for (const line of invoice.lines) {
        if (line.product.type === ProductType.GOODS) {
          const freshProduct = await tx.product.findUnique({
            where: { id: line.productId },
          });

          if (!freshProduct || freshProduct.stockQuantity < line.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${line.product.name}". Available: ${freshProduct?.stockQuantity || 0}, Required: ${line.quantity}. Stock cannot become negative.`,
            );
          }

          // 2. Decrement stock
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

      // 3. Update invoice status
      const updatedInvoice = await tx.customerInvoice.update({
        where: { id },
        data: { status: TransactionStatus.CONFIRMED },
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      });

      // 4. Auto-generate double entry journal
      await this.accountingEngine.recordCustomerInvoiceConfirmed(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: Number(invoice.totalAmount),
        },
        tx,
      );

      return updatedInvoice;
    });
  }

  /**
   * Cancel Customer Invoice:
   * 1. If DRAFT: marks CANCELLED
   * 2. If CONFIRMED:
   *    - Verify no payments recorded
   *    - Re-increment stock back for GOODS
   *    - Record reversal journal entry (Debit Sales Income, Credit Debtors)
   *    - Status -> CANCELLED
   */
  async cancel(id: string) {
    const invoice = await this.findById(id);

    if (invoice.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException(`Invoice "${invoice.invoiceNumber}" is already cancelled`);
    }

    if (Number(invoice.paidAmount) > 0 || invoice.status === TransactionStatus.PAID) {
      throw new BadRequestException(
        `Cannot cancel invoice "${invoice.invoiceNumber}" because payments have been recorded.`,
      );
    }

    if (invoice.status === TransactionStatus.DRAFT) {
      return this.prisma.customerInvoice.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
        include: { customer: true, lines: { include: { product: true } } },
      });
    }

    // If CONFIRMED, perform atomic stock & accounting reversal
    return this.prisma.$transaction(async (tx) => {
      // 1. Re-increment stock for GOODS products
      for (const line of invoice.lines) {
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

      // 2. Generate balanced reversal journal entry
      await this.accountingEngine.recordCustomerInvoiceCancelled(
        {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: Number(invoice.totalAmount),
        },
        tx,
      );

      // 3. Mark invoice as CANCELLED
      return tx.customerInvoice.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
        include: {
          customer: true,
          lines: { include: { product: true } },
        },
      });
    });
  }

  async update(id: string, dto: Partial<CreateCustomerInvoiceDto>) {
    const existing = await this.prisma.customerInvoice.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!existing) {
      throw new NotFoundException(`Customer invoice with ID "${id}" not found`);
    }

    let totalAmount = Number(existing.totalAmount);
    let linesData = undefined;

    if (dto.lines && dto.lines.length > 0) {
      totalAmount = 0;
      linesData = dto.lines.map((line) => {
        const lineSubtotal = line.quantity * line.unitPrice;
        const tax = line.tax || 0;
        const lineTotal = lineSubtotal + tax;
        totalAmount += lineTotal;
        return {
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          tax,
          total: lineTotal,
        };
      });

      // Remove existing lines and re-create updated lines
      await this.prisma.customerInvoiceLine.deleteMany({
        where: { customerInvoiceId: id },
      });
    }

    return this.prisma.customerInvoice.update({
      where: { id },
      data: {
        ...(dto.customerId ? { customerId: dto.customerId } : {}),
        ...(dto.invoiceDate ? { invoiceDate: new Date(dto.invoiceDate) } : {}),
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        totalAmount,
        ...(linesData ? { lines: { create: linesData } } : {}),
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.customerInvoice.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Customer invoice with ID "${id}" not found`);
    }

    await this.prisma.customerInvoiceLine.deleteMany({
      where: { customerInvoiceId: id },
    });

    return this.prisma.customerInvoice.delete({
      where: { id },
    });
  }
}
