import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisHealthIndicator } from './redis-health.indicator';

/**
 * Global Redis module
 * Provides Redis client and health indicator throughout the application
 */
@Global()
@Module({
  providers: [RedisService, RedisHealthIndicator],
  exports: [RedisService, RedisHealthIndicator],
})
export class RedisModule {}
