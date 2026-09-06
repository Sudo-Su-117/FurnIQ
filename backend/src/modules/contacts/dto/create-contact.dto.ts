import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ContactType, ContactStatus } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty({ example: 'Royal Oak Furnishings', description: 'Contact Name' })
  @IsString({ message: 'Name must be a valid string' })
  @IsNotEmpty({ message: 'Contact name is required' })
  @MinLength(2, { message: 'Contact name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    enum: ContactType,
    default: ContactType.CUSTOMER,
    description: 'Contact Type (CUSTOMER, VENDOR, BOTH)',
  })
  @IsEnum(ContactType, { message: 'Type must be one of: CUSTOMER, VENDOR, BOTH' })
  @IsNotEmpty({ message: 'Contact type is required' })
  type: ContactType;

  @ApiPropertyOptional({ example: 'contact@royaloak.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?\d{1,4}[\s-]?)?\(?\d{1,4}\)?[\s-]?\d{1,4}[\s-]?\d{1,9}$/, {
    message: 'Mobile number must be a valid phone format (e.g. +91 9876543210)',
  })
  mobile?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString({ message: 'City must be a valid string' })
  city?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString({ message: 'State must be a valid string' })
  state?: string;

  @ApiPropertyOptional({ example: '560001' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{4,10}$/, { message: 'Pincode must be between 4 and 10 digits' })
  pincode?: string;

  @ApiPropertyOptional({
    example:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    description: 'Contact avatar or logo (supports Base64 Data URI or Image URL)',
  })
  @IsOptional()
  @IsString({ message: 'Profile image must be a valid string' })
  profileImage?: string;

  @ApiPropertyOptional({ enum: ContactStatus, default: ContactStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ContactStatus, { message: 'Status must be one of: ACTIVE, ARCHIVED' })
  status?: ContactStatus = ContactStatus.ACTIVE;
}
