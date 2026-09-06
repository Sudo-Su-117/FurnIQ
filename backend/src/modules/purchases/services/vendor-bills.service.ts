import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateVendorBillDto } from '../dto/create-vendor-bill.dto';
import { AccountingEngineService } from '../../accounting/accounting-engine/accounting-engine.service';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TransactionStatus, ProductType } from '@prisma/client';

@Injectable()
export class VendorBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingEngine: AccountingEngineService,
  ) { }

  async create(dto: CreateVendorBillDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Vendor bill must contain at least one line item');
    }

    const vendor = await this.prisma.contact.findUnique({
      where: { id: dto.vendorId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${dto.vendorId}" not found`);
    }

    // Generate sequential bill number matching seeder template (e.g. BILL-2026-001, BILL-2026-003...)
    const year = new Date().getFullYear();
    const latest = await this.prisma.vendorBill.findFirst({
      where: { billNumber: { startsWith: `BILL-${year}-` } },
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true },
    });
    let nextNum = 1;
    if (latest?.billNumber) {
      const parts = latest.billNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let billNumber = `BILL-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.vendorBill.findUnique({ where: { billNumber } })) {
      nextNum++;
      billNumber = `BILL-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    let untaxedSubtotal = 0;
    const linesData = dto.lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      untaxedSubtotal += lineTotal;
      return {
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: lineTotal,
      };
    });
    const totalAmount = Number((untaxedSubtotal * 1.18).toFixed(2));

    return this.prisma.vendorBill.create({
      data: {
        billNumber,
        vendorId: dto.vendorId,
        purchaseOrderId: dto.purchaseOrderId || null,
        billDate: dto.billDate ? new Date(dto.billDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: TransactionStatus.DRAFT,
        totalAmount,
        paidAmount: 0,
        lines: {
          create: linesData,
        },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        purchaseOrder: true,
      },
    });
  }

  async createFromPO(purchaseOrderId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { lines: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase order with ID "${purchaseOrderId}" not found`);
    }

    const existingBill = await this.prisma.vendorBill.findFirst({
      where: { purchaseOrderId },
      include: {
        vendor: true,
        lines: { include: { product: true } },
        purchaseOrder: true,
      },
    });
    if (existingBill) {
      return existingBill;
    }

    return this.create({
      vendorId: po.vendorId,
      purchaseOrderId: po.id,
      lines: po.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
      })),
    });
  }

  async findAll(
    query: PaginationQueryDto & {
      status?: TransactionStatus;
      vendorId?: string;
      startDate?: string;
      endDate?: string;
    },
    currentUser?: any,
  ) {
    const { page = 1, limit = 10, search, status, vendorId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    // Contact user scoping
    if (currentUser?.role === 'CONTACT_USER' && currentUser?.contactId) {
      where.vendorId = currentUser.contactId;
    }

    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.vendorBill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: true,
          lines: { include: { product: true } },
          payments: true,
        },
      }),
      this.prisma.vendorBill.count({ where }),
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
      where.vendorId = currentUser.contactId;
    }

    const bill = await this.prisma.vendorBill.findFirst({
      where,
      include: {
        vendor: true,
        lines: { include: { product: true } },
        purchaseOrder: true,
        payments: true,
      },
    });

    if (!bill) {
      throw new NotFoundException(`Vendor bill with ID "${id}" not found`);
    }

    return bill;
  }

  /**
   * Confirm Vendor Bill:
   * 1. Status -> CONFIRMED
   * 2. Stock Increase for GOODS products
   * 3. Double-entry accounting entry (Debit: Purchase Expense, Credit: Creditors)
   * Handled atomically via Prisma $transaction
   */
  async confirm(id: string) {
    const bill = await this.findById(id);

    if (bill.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(`Vendor bill is already ${bill.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update bill status
      const updatedBill = await tx.vendorBill.update({
        where: { id },
        data: { status: TransactionStatus.CONFIRMED },
        include: {
          vendor: true,
          lines: { include: { product: true } },
        },
      });

      // 2. Increase stock for GOODS items
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

      // 3. Auto-generate double entry journal
      await this.accountingEngine.recordVendorBillConfirmed(
        {
          id: bill.id,
          billNumber: bill.billNumber,
          totalAmount: Number(bill.totalAmount),
        },
        tx,
      );

      return updatedBill;
    });
  }

  /**
   * Cancel Vendor Bill:
   * 1. If DRAFT: marks CANCELLED
   * 2. If CONFIRMED:
   *    - Verify no payments recorded
   *    - Verify warehouse has enough stock to deduct
   *    - Decrement stock back for GOODS
   *    - Record reversal journal entry (Debit Creditors, Credit Purchase Expense)
   *    - Status -> CANCELLED
   */
  async cancel(id: string) {
    const bill = await this.findById(id);

    if (bill.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException(`Vendor bill "${bill.billNumber}" is already cancelled`);
    }

    if (Number(bill.paidAmount) > 0 || bill.status === TransactionStatus.PAID) {
      throw new BadRequestException(
        `Cannot cancel bill "${bill.billNumber}" because payments have been recorded.`,
      );
    }

    if (bill.status === TransactionStatus.DRAFT) {
      return this.prisma.vendorBill.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
        include: { vendor: true, lines: { include: { product: true } } },
      });
    }

    // If CONFIRMED, perform atomic stock & accounting reversal
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate stock availability before deducting
      for (const line of bill.lines) {
        if (line.product.type === ProductType.GOODS) {
          const freshProduct = await tx.product.findUnique({
            where: { id: line.productId },
          });

          if (!freshProduct || freshProduct.stockQuantity < line.quantity) {
            throw new BadRequestException(
              `Cannot cancel bill "${bill.billNumber}": Insufficient warehouse stock for "${line.product.name}". Available: ${freshProduct?.stockQuantity || 0}, Required to reverse: ${line.quantity}. Stock cannot become negative.`,
            );
          }

          // Decrement stock
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

      // 2. Generate balanced reversal journal entry
      await this.accountingEngine.recordVendorBillCancelled(
        {
          id: bill.id,
          billNumber: bill.billNumber,
          totalAmount: Number(bill.totalAmount),
        },
        tx,
      );

      // 3. Mark bill as CANCELLED
      return tx.vendorBill.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
        include: {
          vendor: true,
          lines: { include: { product: true } },
        },
      });
    });
  }
}
