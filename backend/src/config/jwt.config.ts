import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'furniq_accounting_system_jwt_secret_key_2026',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));
