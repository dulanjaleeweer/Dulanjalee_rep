import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisModule } from '../redis/redis.module';

/**
 * Health check module
 * Provides endpoints for load balancer and monitoring health checks
 */
@Module({
  imports: [
    TerminusModule,
    RedisModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
