import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ContactType, ContactStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryContactsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactType, description: 'Filter by contact type' })
  @IsOptional()
  @IsEnum(ContactType)
  type?: ContactType;

  @ApiPropertyOptional({ enum: ContactStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
