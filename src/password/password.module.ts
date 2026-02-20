import { Module } from '@nestjs/common';
import { PasswordController } from './password.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Password module
 * Handles password reset functionality
 */
@Module({
  imports: [RateLimitModule],
  controllers: [PasswordController],
})
export class PasswordModule {}
