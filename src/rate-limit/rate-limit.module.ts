import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisModule } from '../redis/redis.module';
import { AppConfigModule } from '../config/config.module';

/**
 * Global rate limiting module
 * Automatically registers RateLimitGuard as a global guard
 */
@Global()
@Module({
  imports: [RedisModule, AppConfigModule],
  providers: [
    RateLimitService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
