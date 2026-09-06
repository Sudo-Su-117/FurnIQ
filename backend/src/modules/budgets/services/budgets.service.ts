import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAnalyticAccountDto } from '../dto/create-analytic-account.dto';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Analytic Accounts ====================

  async createAnalyticAccount(dto: CreateAnalyticAccountDto) {
    const existing = await this.prisma.analyticAccount.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Analytic account with name "${dto.name}" already exists`);
    }

    return this.prisma.analyticAccount.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
      },
    });
  }

  async findAllAnalyticAccounts() {
    return this.prisma.analyticAccount.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { budgets: true } },
      },
    });
  }

  // ==================== Budgets ====================

  async createBudget(dto: CreateBudgetDto) {
    const analyticAccount = await this.prisma.analyticAccount.findUnique({
      where: { id: dto.analyticAccountId },
    });
    if (!analyticAccount) {
      throw new NotFoundException(
        `Analytic Account with ID "${dto.analyticAccountId}" not found`,
      );
    }

    return this.prisma.budget.create({
      data: {
        name: dto.name,
        analyticAccountId: dto.analyticAccountId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        responsiblePerson: dto.responsiblePerson,
        plannedAmount: dto.plannedAmount,
      },
      include: {
        analyticAccount: true,
      },
    });
  }

  async findAllBudgets(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { responsiblePerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          analyticAccount: true,
        },
      }),
      this.prisma.budget.count({ where }),
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

  async findBudgetById(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        analyticAccount: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Budget with ID "${id}" not found`);
    }

    return budget;
  }
}
