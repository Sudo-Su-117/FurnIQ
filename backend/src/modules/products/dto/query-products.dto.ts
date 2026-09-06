import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryProductsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProductType, description: 'Filter by product type' })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;
}
