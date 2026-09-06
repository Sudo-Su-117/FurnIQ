import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountType, AccountStatus } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(type?: AccountType, status?: AccountStatus) {
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    return this.prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { journalEntryLines: true } },
      },
    });
  }

  async findById(id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: {
        journalEntryLines: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { journalEntry: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID "${id}" not found`);
    }

    return account;
  }

  async create(data: { name: string; code?: string; type: any }) {
    let type = data.type || AccountType.ASSET;
    const typeUpper = String(type).toUpperCase();
    if (typeUpper === 'EQUITY') type = AccountType.CAPITAL;
    else if (['ASSET', 'LIABILITY', 'CAPITAL', 'INCOME', 'EXPENSE'].includes(typeUpper)) {
      type = typeUpper as AccountType;
    }

    return this.prisma.account.create({
      data: {
        name: data.name,
        code: data.code || null,
        type,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  async update(id: string, data: Partial<{ name: string; code: string; type: any; status: AccountStatus }>) {
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.account.delete({
      where: { id },
    });
  }
}
