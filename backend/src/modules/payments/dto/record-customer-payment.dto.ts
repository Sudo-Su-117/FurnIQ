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

export class RecordCustomerPaymentDto {
  @ApiProperty({ example: 'inv-uuid-1', description: 'Customer Invoice ID to settle' })
  @IsString({ message: 'Customer Invoice ID must be a valid string' })
  @IsNotEmpty({ message: 'Customer Invoice ID is required' })
  customerInvoiceId: string;

  @ApiProperty({
    enum: PaymentMethod,
    default: PaymentMethod.BANK,
    description: 'Payment Method (CASH, BANK)',
  })
  @IsEnum(PaymentMethod, { message: 'Payment method must be one of: CASH, BANK' })
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 50000.0, minimum: 0.01, description: 'Payment Amount' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Payment amount must be a valid number' })
  @Min(0.01, { message: 'Payment amount must be at least 0.01' })
  amount: number;

  @ApiPropertyOptional({ example: '2026-09-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Payment date must be a valid ISO date string' })
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'Bank Ref / UPI Ref #9872341' })
  @IsOptional()
  @IsString({ message: 'Payment reference must be a string' })
  reference?: string;
}
