import { Module } from '@nestjs/common';
import { EmailVerificationController } from './email-verification.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Email verification module
 * Handles email verification and resend functionality
 */
@Module({
  imports: [RateLimitModule],
  controllers: [EmailVerificationController],
})
export class EmailVerificationModule {}
