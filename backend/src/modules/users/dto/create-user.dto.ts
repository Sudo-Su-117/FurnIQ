import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@urbanfurniture.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6, description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Super Admin', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: UserRole,
    default: UserRole.ACCOUNTANT,
    description: 'User access role',
  })
  @IsEnum(UserRole, { message: 'Invalid role supplied' })
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ description: 'Linked contact ID if role is CONTACT_USER' })
  @IsOptional()
  @IsString()
  contactId?: string;
}
