import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Public } from '../../../common/decorators/public.decorator';
import { AccountType, AccountStatus } from '@prisma/client';

@ApiTags('Chart of Accounts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/accounting/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get Chart of Accounts list (Public)' })
  @ApiQuery({ name: 'type', enum: AccountType, required: false })
  @ApiQuery({ name: 'status', enum: AccountStatus, required: false })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async findAll(
    @Query('type') type?: AccountType,
    @Query('status') status?: AccountStatus,
  ) {
    return this.accountsService.findAll(type, status);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get account details and ledger lines by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Account retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.accountsService.findById(id);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new account in Chart of Accounts (Public)' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  async create(@Body() body: { name: string; code?: string; type: any }) {
    return this.accountsService.create(body);
  }

  @Public()
  @Patch(':id')
  @ApiOperation({ summary: 'Update an account (Public)' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.accountsService.update(id, body);
  }

  @Public()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account (Public)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}
