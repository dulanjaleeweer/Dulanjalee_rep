import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import { AuthFailureTrackerService } from './auth-failure-tracker.service';
import { RedisModule } from '../redis/redis.module';
import { AppConfigModule } from '../config/config.module';
import { SecurityAuditModule } from '../security-audit/security-audit.module';
import { MetricsModule } from '../metrics/metrics.module';

/**
 * Global rate limiting module
 * Automatically registers RateLimitGuard as a global guard
 */
@Global()
@Module({
  imports: [RedisModule, AppConfigModule, SecurityAuditModule, MetricsModule],
  providers: [
    RateLimitService,
    AuthFailureTrackerService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RateLimitService, AuthFailureTrackerService],
})
export class RateLimitModule {}
