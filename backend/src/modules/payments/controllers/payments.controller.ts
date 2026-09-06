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
import { PaymentsService } from '../services/payments.service';
import { RecordCustomerPaymentDto } from '../dto/record-customer-payment.dto';
import { RecordVendorPaymentDto } from '../dto/record-vendor-payment.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PaymentType } from '@prisma/client';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('customer')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CONTACT_USER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record Customer Payment (Settles Invoice & Generates Journal)' })
  @ApiResponse({ status: 201, description: 'Customer payment recorded and invoice updated' })
  async recordCustomerPayment(
    @Body() dto: RecordCustomerPaymentDto,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.recordCustomerPayment(dto, user);
  }

  @Post('vendor')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record Vendor Payment (Settles Bill & Generates Journal)' })
  @ApiResponse({ status: 201, description: 'Vendor payment recorded and bill updated' })
  async recordVendorPayment(@Body() dto: RecordVendorPaymentDto) {
    return this.paymentsService.recordVendorPayment(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List payments with pagination and type filter (Public)' })
  @ApiQuery({ name: 'type', enum: PaymentType, required: false })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Query('type') type?: PaymentType,
    @CurrentUser() user?: any,
  ) {
    return this.paymentsService.findAll(query, type, user);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get payment details by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.paymentsService.findById(id, user);
  }
}
