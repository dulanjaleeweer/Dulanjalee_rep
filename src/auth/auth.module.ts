import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { AppConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { RegistrationService } from './services/registration.service';
import { PasswordService } from './services/password.service';
import { PasswordPolicyService } from './services/password-policy.service';

/**
 * Authentication module
 * Provides login, refresh token, MFA, and registration endpoints
 * Integrates with AuthFailureTracker for abuse detection
 */
@Module({
  imports: [RateLimitModule, AppConfigModule, DatabaseModule],
  controllers: [AuthController],
  providers: [RegistrationService, PasswordService, PasswordPolicyService],
})
export class AuthModule {}
