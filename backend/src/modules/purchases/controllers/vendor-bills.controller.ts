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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorBillsService } from '../services/vendor-bills.service';
import { CreateVendorBillDto } from '../dto/create-vendor-bill.dto';
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
@Controller('api/v1/purchases/bills')
export class VendorBillsController {
  constructor(private readonly vendorBillsService: VendorBillsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Vendor Bill directly' })
  @ApiResponse({
    status: 201,
    description: 'Vendor bill created successfully',
  })
  async create(@Body() dto: CreateVendorBillDto) {
    return this.vendorBillsService.create(dto);
  }

  @Post('from-po/:poId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convert Purchase Order into a Vendor Bill' })
  @ApiResponse({ status: 201, description: 'Vendor bill generated from PO' })
  async createFromPO(@Param('poId') poId: string) {
    return this.vendorBillsService.createFromPO(poId);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'List vendor bills with pagination, date, and status filters (Public)',
  })
  @ApiQuery({ name: 'status', enum: TransactionStatus, required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'startDate', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2026-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Vendor bills retrieved successfully',
  })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('status') status?: TransactionStatus,
    @Query('vendorId') vendorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: any,
  ) {
    return this.vendorBillsService.findAll(
      { ...query, status, vendorId, startDate, endDate },
      user,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get vendor bill details by ID (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Vendor bill retrieved successfully',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.vendorBillsService.findById(id, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Confirm Vendor Bill (Increases GOODS stock + Generates Double-entry Journal)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor bill confirmed and stock updated',
  })
  async confirm(@Param('id') id: string) {
    return this.vendorBillsService.confirm(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary:
      'Cancel Vendor Bill (Decrements GOODS Stock + Generates Reversal Journal Entry)',
  })
  @ApiResponse({
    status: 200,
    description: 'Vendor bill cancelled and reversed successfully',
  })
  async cancel(@Param('id') id: string) {
    return this.vendorBillsService.cancel(id);
  }
}
