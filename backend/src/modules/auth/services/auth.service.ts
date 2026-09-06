import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { HashUtil } from '../../../common/utils/hash.util';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `An account with email "${dto.email}" already exists`,
      );
    }

    const hashedPassword = await HashUtil.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        name: dto.name,
        role: (dto.role as any) || 'ACCOUNTANT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user,
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    const isPasswordValid = await HashUtil.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      contactId: user.contactId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = await this.generateTokens(safeUser);

    return {
      user: safeUser,
      tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        contactId: true,
        contact: {
          select: {
            id: true,
            name: true,
            type: true,
            email: true,
            mobile: true,
            city: true,
            state: true,
            status: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    return user;
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    contactId?: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      contactId: user.contactId,
    };

    const expiresIn =
      this.configService.get<string>('jwt.expiresIn') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: expiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '30d' as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}
