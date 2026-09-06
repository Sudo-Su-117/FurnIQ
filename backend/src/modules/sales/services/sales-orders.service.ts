import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateSalesOrderDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Sales order must contain at least one line item');
    }

    const customer = await this.prisma.contact.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
    }

    // Generate sequential order number matching seeder template (e.g. SO-2026-001, SO-2026-004...)
    const year = new Date().getFullYear();
    const latest = await this.prisma.salesOrder.findFirst({
      where: { orderNumber: { startsWith: `SO-${year}-` } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    let nextNum = 1;
    if (latest?.orderNumber) {
      const parts = latest.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let orderNumber = `SO-${year}-${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.salesOrder.findUnique({ where: { orderNumber } })) {
      nextNum++;
      orderNumber = `SO-${year}-${String(nextNum).padStart(3, '0')}`;
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

    return this.prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: dto.customerId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        status: TransactionStatus.DRAFT,
        totalAmount,
        lines: {
          create: linesData,
        },
      },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
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
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          lines: { include: { product: true } },
          customerInvoices: true,
        },
      }),
      this.prisma.salesOrder.count({ where }),
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

    const so = await this.prisma.salesOrder.findFirst({
      where,
      include: {
        customer: true,
        lines: { include: { product: true } },
        customerInvoices: { include: { lines: true } },
      },
    });

    if (!so) {
      throw new NotFoundException(`Sales order with ID "${id}" not found`);
    }

    return so;
  }

  async confirm(id: string) {
    const so = await this.findById(id);

    if (so.status !== TransactionStatus.DRAFT) {
      throw new BadRequestException(`Sales order is already ${so.status}`);
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: TransactionStatus.CONFIRMED },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });
  }

  async cancel(id: string) {
    const so = await this.findById(id);

    if (so.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException(`Sales order "${so.orderNumber}" is already cancelled`);
    }

    const activeInvoices = so.customerInvoices.filter(
      (inv: any) => inv.status !== TransactionStatus.CANCELLED,
    );
    if (activeInvoices.length > 0) {
      throw new BadRequestException(
        `Cannot cancel sales order "${so.orderNumber}" because it has active customer invoices. Cancel invoices first.`,
      );
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });
  }
}
