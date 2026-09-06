import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomerInvoicesService } from '../services/customer-invoices.service';
import { CreateCustomerInvoiceDto } from '../dto/create-customer-invoice.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TransactionStatus } from '@prisma/client';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/sales/invoices')
export class CustomerInvoicesController {
  constructor(
    private readonly customerInvoicesService: CustomerInvoicesService,
  ) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Customer Invoice directly' })
  @ApiResponse({
    status: 201,
    description: 'Customer invoice created successfully',
  })
  async create(@Body() dto: CreateCustomerInvoiceDto) {
    return this.customerInvoicesService.create(dto);
  }

  @Post('from-so/:soId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convert Sales Order into a Customer Invoice' })
  @ApiResponse({
    status: 201,
    description: 'Customer invoice generated from SO',
  })
  async createFromSO(@Param('soId') soId: string) {
    return this.customerInvoicesService.createFromSO(soId);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'List customer invoices with pagination, date, and status filters (Public)',
  })
  @ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Customer invoices retrieved successfully',
  })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: TransactionStatus,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.customerInvoicesService.findAll(
      { ...query, status, customerId, startDate, endDate },
      user,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get customer invoice details by ID (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Customer invoice retrieved successfully',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.customerInvoicesService.findById(id, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Confirm Customer Invoice (Validates & Decreases GOODS Stock + Generates Double-entry Journal)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer invoice confirmed and stock updated',
  })
  async confirm(@Param('id') id: string) {
    return this.customerInvoicesService.confirm(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Cancel Customer Invoice (Reverses GOODS Stock + Generates Reversal Journal Entry)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer invoice cancelled and reversed successfully',
  })
  async cancel(@Param('id') id: string) {
    return this.customerInvoicesService.cancel(id);
  }
}
