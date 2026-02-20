import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '../redis/redis-health.indicator';
import { AppConfigService } from '../config/config.service';

/**
 * Health check controller
 * Provides endpoints for liveness and readiness probes
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Liveness probe
   * Returns 200 if the application is running
   * Used by load balancers and orchestrators to determine if the app should receive traffic
   */
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Basic memory check - fail if using > 1.5GB heap
      () => this.memory.checkHeap('memory_heap', 1500 * 1024 * 1024),
      // Basic disk check - fail if < 250MB free
      () =>
        this.disk.checkStorage('disk_storage', {
          thresholdPercent: 0.9,
          path: '/',
        }),
    ]);
  }

  /**
   * Readiness probe
   * Returns 200 if the application is ready to handle requests
   * Checks critical dependencies like Redis
   */
  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      // Redis connectivity check - critical for rate limiting
      () => this.redis.isHealthy('redis'),
      // Memory check with lower threshold for readiness
      () => this.memory.checkHeap('memory_heap', 1200 * 1024 * 1024),
    ]);
  }

  /**
   * Liveness probe (alternative endpoint)
   * Some load balancers expect /health/live
   */
  @Get('live')
  @HealthCheck()
  async live(): Promise<HealthCheckResult> {
    return this.check();
  }
}
