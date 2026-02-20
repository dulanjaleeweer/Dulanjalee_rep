import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Authentication module
 * Provides login, refresh token, and MFA endpoints
 */
@Module({
  imports: [RateLimitModule],
  controllers: [AuthController],
})
export class AuthModule {}
