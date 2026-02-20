import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from './redis.service';

/**
 * Redis health indicator for Terminus health checks
 * Reports Redis connectivity status for load balancer health checks
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  /**
   * Check Redis connectivity
   * Returns healthy if Redis responds to ping within timeout
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Set a timeout for the ping operation
      const timeout = 2000; // 2 seconds

      const pingPromise = this.redisService.ping();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Redis ping timeout')), timeout);
      });

      const result = await Promise.race([pingPromise, timeoutPromise]);

      if (result === 'PONG') {
        return this.getStatus(key, true, {
          status: 'up',
          responseTime: '< 2s',
        });
      }

      throw new Error(`Unexpected Redis ping response: ${result}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          status: 'down',
          error: errorMessage,
        }),
      );
    }
  }
}
