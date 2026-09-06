import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JournalType } from '@prisma/client';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: JournalType) {
    const where: any = {};
    if (type) where.type = type;

    return this.prisma.journal.findMany({
      where,
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
        _count: { select: { journalEntries: true } },
      },
    });
  }

  async findById(id: string) {
    const journal = await this.prisma.journal.findUnique({
      where: { id },
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
        journalEntries: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { lines: { include: { account: true } } },
        },
      },
    });

    if (!journal) {
      throw new NotFoundException(`Journal with ID "${id}" not found`);
    }

    return journal;
  }

  async create(data: { name: string; type: any; defaultDebitAccountId?: string; defaultCreditAccountId?: string }) {
    let type: JournalType = JournalType.SALES;
    const typeUpper = String(data.type || '').toUpperCase();
    if (['SALES', 'PURCHASE', 'BANK', 'CASH'].includes(typeUpper)) {
      type = typeUpper as JournalType;
    }

    return this.prisma.journal.create({
      data: {
        name: data.name,
        type,
        defaultDebitAccountId: data.defaultDebitAccountId && String(data.defaultDebitAccountId).trim() !== '' ? data.defaultDebitAccountId : null,
        defaultCreditAccountId: data.defaultCreditAccountId && String(data.defaultCreditAccountId).trim() !== '' ? data.defaultCreditAccountId : null,
      },
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.type) {
      const typeUpper = String(data.type).toUpperCase();
      if (['SALES', 'PURCHASE', 'BANK', 'CASH'].includes(typeUpper)) {
        updateData.type = typeUpper as JournalType;
      }
    }
    if ('defaultDebitAccountId' in data) {
      updateData.defaultDebitAccountId = data.defaultDebitAccountId && String(data.defaultDebitAccountId).trim() !== '' ? data.defaultDebitAccountId : null;
    }
    if ('defaultCreditAccountId' in data) {
      updateData.defaultCreditAccountId = data.defaultCreditAccountId && String(data.defaultCreditAccountId).trim() !== '' ? data.defaultCreditAccountId : null;
    }

    return this.prisma.journal.update({
      where: { id },
      data: updateData,
      include: {
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.journal.delete({
      where: { id },
    });
  }
}
