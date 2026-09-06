import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { HashUtil } from '../../../common/utils/hash.util';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const hashedPassword = await HashUtil.hash(dto.password);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: dto.name,
        role: dto.role as any,
        contactId: dto.contactId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          contactId: true,
          contact: { select: { id: true, name: true, type: true } },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }
}
