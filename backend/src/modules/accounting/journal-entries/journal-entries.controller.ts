import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JournalEntriesService } from './journal-entries.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JournalType } from '@prisma/client';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Journal Entries')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/accounting/journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List double-entry journal vouchers with pagination, filters (Public)',
  })
  @ApiQuery({ name: 'journalId', required: false })
  @ApiQuery({ name: 'journalType', enum: JournalType, required: false })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved successfully' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('journalId') journalId?: string,
    @Query('journalType') journalType?: JournalType,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.journalEntriesService.findAll({
      ...query,
      journalId,
      journalType,
      accountId,
      startDate,
      endDate,
    });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry by ID with debit/credit lines (Public)' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.journalEntriesService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new manual journal entry (Draft or Posted)' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  async create(@Body() dto: any) {
    return this.journalEntriesService.createManual(dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Delete a journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Journal entry deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.journalEntriesService.remove(id);
  }
}
