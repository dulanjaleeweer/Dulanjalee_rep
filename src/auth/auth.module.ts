import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AppConfigModule } from '../config/config.module';

/**
 * Authentication module
 * Provides login, refresh token, and MFA endpoints
 * Integrates with AuthFailureTracker for abuse detection
 */
@Module({
  imports: [RateLimitModule, AppConfigModule],
  controllers: [AuthController],
})
export class AuthModule {}
