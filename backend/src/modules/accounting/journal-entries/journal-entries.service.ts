import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JournalType } from '@prisma/client';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: PaginationQueryDto & {
      journalId?: string;
      journalType?: JournalType;
      accountId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      journalId,
      journalType,
      accountId,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (journalId) {
      where.journalId = journalId;
    }

    if (journalType) {
      where.journal = { type: journalType };
    }

    if (accountId) {
      where.lines = {
        some: { accountId },
      };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          journal: true,
          lines: {
            include: { account: true },
          },
        },
      }),
      this.prisma.journalEntry.count({ where }),
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
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journal: true,
        lines: {
          include: { account: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Journal entry with ID "${id}" not found`);
    }

    return entry;
  }

  async createManual(dto: {
    journalId: string;
    accountingDate?: string;
    reference?: string;
    lines: Array<{
      accountId: string;
      debit?: number;
      credit?: number;
      description?: string;
    }>;
  }) {
    // Find the journal to validate it exists
    const journal = await this.prisma.journal.findUnique({
      where: { id: dto.journalId },
    });

    // Auto-generate entry number consistent with standard format (e.g. JE-2026-004)
    const count = await this.prisma.journalEntry.count();
    const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.journalEntry.create({
      data: {
        entryNumber,
        date: dto.accountingDate ? new Date(dto.accountingDate) : new Date(),
        reference: dto.reference || null,
        journalId: journal?.id || dto.journalId,
        lines: {
          create: (dto.lines || []).map((l) => ({
            accountId: l.accountId,
            debit: l.debit || 0,
            credit: l.credit || 0,
            description: l.description || null,
          })),
        },
      },
        include: {
          journal: true,
          lines: {
            include: { account: true },
          },
        },
      });
    }

    async remove(id: string) {
      const entry = await this.prisma.journalEntry.findUnique({ where: { id } });
      if (!entry) {
        throw new NotFoundException(`Journal entry with ID "${id}" not found`);
      }
      return this.prisma.journalEntry.delete({ where: { id } });
    }
}

