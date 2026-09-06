import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesOrdersService } from '../services/sales-orders.service';
import { CreateSalesOrderDto } from '../dto/create-sales-order.dto';
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
@Controller('api/v1/sales/orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Sales Order' })
  @ApiResponse({ status: 201, description: 'Sales order created successfully' })
  async create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List sales orders with pagination, date, and status filters (Public)' })
  @ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Sales orders retrieved successfully' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: TransactionStatus,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.salesOrdersService.findAll(
      { ...query, status, customerId, startDate, endDate },
      user,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get sales order details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Sales order retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.salesOrdersService.findById(id, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Confirm a Sales Order' })
  @ApiResponse({ status: 200, description: 'Sales order confirmed' })
  async confirm(@Param('id') id: string) {
    return this.salesOrdersService.confirm(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Cancel a Sales Order' })
  @ApiResponse({ status: 200, description: 'Sales order cancelled successfully' })
  async cancel(@Param('id') id: string) {
    return this.salesOrdersService.cancel(id);
  }
}

