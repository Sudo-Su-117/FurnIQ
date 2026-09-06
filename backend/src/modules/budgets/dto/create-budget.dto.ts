import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Q3 Timber Sourcing Budget', description: 'Budget name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'analytic-uuid-1', description: 'Linked Analytic Account ID' })
  @IsString()
  @IsNotEmpty()
  analyticAccountId: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z', description: 'Period Start Date' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-09-30T23:59:59.000Z', description: 'Period End Date' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 'Purchase Manager', description: 'Responsible Person / Dept' })
  @IsString()
  @IsNotEmpty()
  responsiblePerson: string;

  @ApiProperty({ example: 500000.0, minimum: 0, description: 'Planned target amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedAmount: number;
}
