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

export class RegisterDto {
  @ApiProperty({ example: 'admin@urbanfurniture.com', description: 'User email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6, description: 'Secure password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Super Admin', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.ACCOUNTANT,
    description: 'Assigned system role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.ACCOUNTANT;
}
