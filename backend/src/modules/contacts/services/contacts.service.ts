import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { QueryContactsDto } from '../dto/query-contacts.dto';
import { ContactStatus, ContactType } from '@prisma/client';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateContactDto) {
    if (dto.email) {
      const existing = await this.prisma.contact.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new ConflictException(`Contact with email "${dto.email}" already exists`);
      }
    }

    // Generate sequential contact ID (e.g. VEND-2026-001, CUST-2026-001...)
    const year = new Date().getFullYear();
    const typePrefix = dto.type === ContactType.VENDOR ? 'VEND' : (dto.type === ContactType.CUSTOMER ? 'CUST' : 'CONT');
    const prefix = `${typePrefix}-${year}-`;
    const latestContact = await this.prisma.contact.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    let nextNum = 1;
    if (latestContact?.id) {
      const parts = latestContact.id.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let newId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.contact.findUnique({ where: { id: newId } })) {
      nextNum++;
      newId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return this.prisma.contact.create({
      data: {
        id: newId,
        name: dto.name,
        type: dto.type,
        email: dto.email ? dto.email.toLowerCase().trim() : null,
        mobile: dto.mobile || null,
        city: dto.city || null,
        state: dto.state || null,
        pincode: dto.pincode || null,
        profileImage: dto.profileImage || null,
        status: dto.status || ContactStatus.ACTIVE,
      },
    });
  }

  async findAll(query: QueryContactsDto) {
    const { page = 1, limit = 10, search, type, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
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

  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } },
        vendorBills: { take: 5, orderBy: { createdAt: 'desc' } },
        salesOrders: { take: 5, orderBy: { createdAt: 'desc' } },
        customerInvoices: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID "${id}" not found`);
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findById(id);

    if (dto.email) {
      const existing = await this.prisma.contact.findFirst({
        where: { email: dto.email.toLowerCase().trim(), id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Contact with email "${dto.email}" already exists`);
      }
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
      },
    });
  }

  async archive(id: string) {
    await this.findById(id);
    return this.prisma.contact.update({
      where: { id },
      data: { status: ContactStatus.ARCHIVED },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink any user accounts linked to this contact
      await tx.user.updateMany({
        where: { contactId: id },
        data: { contactId: null },
      });

      // 2. Delete payments directly linked to this contact
      await tx.payment.deleteMany({
        where: { contactId: id },
      });

      // 3. Customer Invoices & related payments and lines
      const invoices = await tx.customerInvoice.findMany({
        where: { customerId: id },
        select: { id: true },
      });
      const invoiceIds = invoices.map((inv) => inv.id);
      if (invoiceIds.length > 0) {
        await tx.payment.deleteMany({
          where: { customerInvoiceId: { in: invoiceIds } },
        });
        await tx.customerInvoiceLine.deleteMany({
          where: { customerInvoiceId: { in: invoiceIds } },
        });
        await tx.customerInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      // 4. Sales Orders & lines
      const salesOrders = await tx.salesOrder.findMany({
        where: { customerId: id },
        select: { id: true },
      });
      const soIds = salesOrders.map((so) => so.id);
      if (soIds.length > 0) {
        await tx.salesOrderLine.deleteMany({
          where: { salesOrderId: { in: soIds } },
        });
        await tx.salesOrder.deleteMany({
          where: { id: { in: soIds } },
        });
      }

      // 5. Vendor Bills & related payments and lines
      const vendorBills = await tx.vendorBill.findMany({
        where: { vendorId: id },
        select: { id: true },
      });
      const billIds = vendorBills.map((b) => b.id);
      if (billIds.length > 0) {
        await tx.payment.deleteMany({
          where: { vendorBillId: { in: billIds } },
        });
        await tx.vendorBillLine.deleteMany({
          where: { vendorBillId: { in: billIds } },
        });
        await tx.vendorBill.deleteMany({
          where: { id: { in: billIds } },
        });
      }

      // 6. Purchase Orders & lines
      const purchaseOrders = await tx.purchaseOrder.findMany({
        where: { vendorId: id },
        select: { id: true },
      });
      const poIds = purchaseOrders.map((po) => po.id);
      if (poIds.length > 0) {
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderId: { in: poIds } },
        });
        await tx.purchaseOrder.deleteMany({
          where: { id: { in: poIds } },
        });
      }

      // 7. Delete the contact itself
      return tx.contact.delete({
        where: { id },
      });
    });
  }
}
