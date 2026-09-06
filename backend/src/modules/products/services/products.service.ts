import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { QueryProductsDto } from '../dto/query-products.dto';
import { ProductType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateProductDto) {
    const stockQuantity = dto.type === ProductType.GOODS ? (dto.stockQuantity || 0) : 0;

    // Generate sequential product ID matching seeder template (e.g. PROD-2026-001, PROD-2026-010...)
    const year = new Date().getFullYear();
    const prefix = `PROD-${year}-`;
    const latestProd = await this.prisma.product.findFirst({
      where: { id: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    let nextNum = 1;
    if (latestProd?.id) {
      const parts = latestProd.id.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    let newId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    while (await this.prisma.product.findUnique({ where: { id: newId } })) {
      nextNum++;
      newId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return this.prisma.product.create({
      data: {
        id: newId,
        name: dto.name,
        type: dto.type,
        salesPrice: dto.salesPrice,
        costPrice: dto.costPrice,
        category: dto.category || null,
        image: dto.image || null,
        stockQuantity,
      },
    });
  }

  async findAll(query: QueryProductsDto) {
    const { page = 1, limit = 10, search, type, category } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (category) where.category = { contains: category, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        stockQuantity:
          dto.type === ProductType.SERVICE
            ? 0
            : dto.stockQuantity !== undefined
              ? dto.stockQuantity
              : undefined,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete purchase order lines referencing this product
      await tx.purchaseOrderLine.deleteMany({
        where: { productId: id },
      });

      // 2. Delete vendor bill lines referencing this product
      await tx.vendorBillLine.deleteMany({
        where: { productId: id },
      });

      // 3. Delete sales order lines referencing this product
      await tx.salesOrderLine.deleteMany({
        where: { productId: id },
      });

      // 4. Delete customer invoice lines referencing this product
      await tx.customerInvoiceLine.deleteMany({
        where: { productId: id },
      });

      // 5. Delete the product itself
      return tx.product.delete({
        where: { id },
      });
    });
  }
}
