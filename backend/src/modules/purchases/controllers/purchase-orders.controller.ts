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
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TransactionStatus } from '@prisma/client';

@ApiTags('Purchases')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/purchases/orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) { }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Purchase Order' })
  @ApiResponse({ status: 201, description: 'Purchase order created successfully' })
  async create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List purchase orders with pagination, date, and status filters (Public)' })
  @ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({ status: 200, description: 'Purchase orders retrieved successfully' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: TransactionStatus,
    @Query('vendorId') vendorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.purchaseOrdersService.findAll(
      { ...query, status, vendorId, startDate, endDate },
      user,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Purchase order retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.purchaseOrdersService.findById(id, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Confirm a Purchase Order' })
  @ApiResponse({ status: 200, description: 'Purchase order confirmed' })
  async confirm(@Param('id') id: string) {
    return this.purchaseOrdersService.confirm(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Cancel a Purchase Order' })
  @ApiResponse({ status: 200, description: 'Purchase order cancelled successfully' })
  async cancel(@Param('id') id: string) {
    return this.purchaseOrdersService.cancel(id);
  }
}

