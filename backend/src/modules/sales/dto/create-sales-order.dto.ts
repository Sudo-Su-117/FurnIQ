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

export class SalesOrderLineDto {
  @ApiProperty({ example: 'prod-uuid-1', description: 'Product ID' })
  @IsString({ message: 'Product ID must be a valid string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, description: 'Quantity ordered' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiProperty({ example: 38000.0, minimum: 0, description: 'Sales unit price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Unit price must be a valid number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0, description: 'Tax amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tax must be a valid number' })
  @Min(0, { message: 'Tax cannot be negative' })
  tax?: number = 0;
}

export class CreateSalesOrderDto {
  @ApiProperty({ example: 'customer-uuid-1', description: 'Customer Contact ID' })
  @IsString({ message: 'Customer ID must be a valid string' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiPropertyOptional({ example: '2026-09-05T00:00:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'Order date must be a valid ISO date string' })
  orderDate?: string;

  @ApiProperty({ type: [SalesOrderLineDto], description: 'Sales order lines' })
  @IsArray({ message: 'Lines must be an array of order items' })
  @ArrayMinSize(1, { message: 'Sales order must contain at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines: SalesOrderLineDto[];
}
