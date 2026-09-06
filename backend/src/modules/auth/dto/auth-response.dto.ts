import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class TokenDto {
  @ApiProperty({ description: 'JWT Access Token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token' })
  refreshToken: string;

  @ApiProperty({ example: '7d', description: 'Expiration period' })
  expiresIn: string;
}

export class AuthResponseDataDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: TokenDto })
  tokens: TokenDto;
}
