import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VendorBillLineDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'Product ID' })
  @IsString({ message: 'Product ID must be a valid string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiProperty({ example: 10, minimum: 1, description: 'Quantity on bill' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiProperty({ example: 16000.0, minimum: 0, description: 'Unit cost price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Unit price must be a valid number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;
}

export class CreateVendorBillDto {
  @ApiProperty({ example: 'vendor-uuid-1', description: 'Vendor Contact ID' })
  @IsString({ message: 'Vendor ID must be a valid string' })
  @IsNotEmpty({ message: 'Vendor ID is required' })
  vendorId: string;

  @ApiPropertyOptional({ description: 'Linked Purchase Order ID if converted from PO' })
  @IsOptional()
  @IsString({ message: 'Purchase Order ID must be a valid string' })
  purchaseOrderId?: string;

  @ApiPropertyOptional({ example: '2026-09-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Bill date must be a valid ISO date string' })
  billDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @ApiProperty({ type: [VendorBillLineDto], description: 'Bill line items' })
  @IsArray({ message: 'Lines must be an array of bill items' })
  @ArrayMinSize(1, { message: 'Vendor bill must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => VendorBillLineDto)
  lines: VendorBillLineDto[];
}
