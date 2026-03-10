import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Consent module
 * Handles consent management operations
 */
@Module({
  imports: [RateLimitModule],
  controllers: [ConsentController],
})
export class ConsentModule {}
