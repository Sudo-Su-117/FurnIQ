import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDataDto } from '../dto/auth-response.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user account',
    description: 'Registers user and issues initial JWT access & refresh tokens',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDataDto,
  })
  @ApiResponse({ status: 409, description: 'Email address already registered' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticates with email and password, returns JWT tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDataDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description: 'Returns profile details and linked contact (if any)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }
}
