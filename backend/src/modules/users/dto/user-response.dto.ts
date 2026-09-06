import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'admin@urbanfurniture.com' })
  email: string;

  @ApiProperty({ example: 'Super Admin' })
  name: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiPropertyOptional({ example: null })
  contactId?: string | null;

  @ApiProperty({ example: '2026-09-05T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-05T10:00:00.000Z' })
  updatedAt: Date;
}
