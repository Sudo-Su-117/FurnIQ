import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ProductType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Solid Teak Wood 6-Seater Dining Table' })
  @IsString({ message: 'Product name must be a valid string' })
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(2, { message: 'Product name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    enum: ProductType,
    default: ProductType.GOODS,
    description: 'Product Type (GOODS affects stock, SERVICE does not)',
  })
  @IsEnum(ProductType, { message: 'Product type must be one of: GOODS, SERVICE, COMBO' })
  @IsNotEmpty({ message: 'Product type is required' })
  type: ProductType;

  @ApiProperty({ example: 38000.0, minimum: 0, description: 'Sales Price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Sales price must be a valid number' })
  @Min(0, { message: 'Sales price cannot be negative' })
  salesPrice: number;

  @ApiProperty({ example: 24000.0, minimum: 0, description: 'Cost Price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Cost price must be a valid number' })
  @Min(0, { message: 'Cost price cannot be negative' })
  costPrice: number;

  @ApiPropertyOptional({ example: 'Dining Furniture' })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  category?: string;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    description: 'Product image (supports Base64 Data URI or Image URL)',
  })
  @IsOptional()
  @IsString({ message: 'Product image must be a valid string' })
  image?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    default: 0,
    description: 'Initial Stock Quantity (only applicable for GOODS)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Stock quantity must be an integer' })
  @Min(0, { message: 'Stock quantity cannot be negative' })
  stockQuantity?: number = 0;
}
