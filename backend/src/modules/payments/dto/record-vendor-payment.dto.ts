import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class RecordVendorPaymentDto {
  @ApiProperty({ example: 'bill-uuid-1', description: 'Vendor Bill ID to settle' })
  @IsString({ message: 'Vendor Bill ID must be a valid string' })
  @IsNotEmpty({ message: 'Vendor Bill ID is required' })
  vendorBillId: string;

  @ApiProperty({
    enum: PaymentMethod,
    default: PaymentMethod.BANK,
    description: 'Payment Method (CASH, BANK)',
  })
  @IsEnum(PaymentMethod, { message: 'Payment method must be one of: CASH, BANK' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 160000.0, minimum: 0.01, description: 'Payment Amount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Payment amount must be a valid number' })
  @Min(0.01, { message: 'Payment amount must be at least 0.01' })
  amount: number;

  @ApiPropertyOptional({ example: '2026-09-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Payment date must be a valid ISO date string' })
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'NEFT Transfer #128938' })
  @IsOptional()
  @IsString({ message: 'Payment reference must be a string' })
  reference?: string;
}
