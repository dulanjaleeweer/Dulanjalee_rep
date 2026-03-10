import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Public module
 * Handles public endpoints with baseline rate limiting
 */
@Module({
  imports: [RateLimitModule],
  controllers: [PublicController],
})
export class PublicModule {}
