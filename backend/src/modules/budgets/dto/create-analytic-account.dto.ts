import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AnalyticAccountType } from '@prisma/client';

export class CreateAnalyticAccountDto {
  @ApiProperty({ example: 'Raw Timber Procurement', description: 'Analytic account name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: AnalyticAccountType,
    default: AnalyticAccountType.EXPENSE,
    description: 'Account nature (INCOME / EXPENSE)',
  })
  @IsEnum(AnalyticAccountType)
  @IsNotEmpty()
  type: AnalyticAccountType;
}
