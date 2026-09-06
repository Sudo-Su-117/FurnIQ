import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreatePurchaseOrderDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Purchase order must have at least one product line');
    }

    // Verify vendor
    const vendor = await this.prisma.contact.findUnique({
      where: { id: dto.vendorId },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID "${dto.vendorId}" not found`);
    }

    // Generate sequential order number matching seeder template (e.g. PO-2026-001, PO-2026-004...)
    const year = new Date().getFullYear();
    const latest = await this.prisma.purchaseOrder.findFirst({
      where: { orderNumber: { startsWith: `PO-${year}-` } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    let nextNum = 1;
    if (latest?.orderNumber) {
      const parts = latest.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let orderNumber = `PO-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.purchaseOrder.findUnique({ where: { orderNumber } })) {
      nextNum++;
      orderNumber = `PO-${year}-${String(nextNum).padStart(3, '0')}`;
    }

    // Calculate line totals and grand total
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

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        vendorId: dto.vendorId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        status: TransactionStatus.DRAFT,
        totalAmount,
        lines: {
          create: linesData,
        },
      },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
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
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: true,
          lines: { include: { product: true } },
          vendorBills: true,
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
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

    const po = await this.prisma.purchaseOrder.findFirst({
      where,
      include: {
        vendor: true,
        lines: { include: { product: true } },
        vendorBills: { include: { lines: true } },
      },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    return po;
  }

  async confirm(id: string) {
    const po = await this.findById(id);

    if (po.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(`Purchase order is already ${po.status}`);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: TransactionStatus.CONFIRMED },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
    });
  }

  async cancel(id: string) {
    const po = await this.findById(id);

    if (po.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException(`Purchase order "${po.orderNumber}" is already cancelled`);
    }

    const activeBills = po.vendorBills.filter(
      (bill: any) => bill.status !== TransactionStatus.CANCELLED,
    );
    if (activeBills.length > 0) {
      throw new BadRequestException(
        `Cannot cancel purchase order "${po.orderNumber}" because it has active vendor bills. Cancel bills first.`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
      include: {
        vendor: true,
        lines: { include: { product: true } },
      },
    });
  }
}
