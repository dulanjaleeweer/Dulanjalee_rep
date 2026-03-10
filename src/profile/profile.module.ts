import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Profile module
 * Handles user profile operations
 */
@Module({
  imports: [RateLimitModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
