import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Auth failure tracking service
 * Tracks consecutive authentication failures per identifier
 * Emits security events when thresholds are reached
 */
@Injectable()
export class AuthFailureTrackerService {
  private readonly logger = new Logger(AuthFailureTrackerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: AppConfigService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Record an authentication failure
   * Tracks by both IP and email hash separately
   */
  async recordFailure(
    identifier: string,
    type: 'login' | 'password_reset' | 'email_verify' | 'token_refresh',
    context: {
      route: string;
      tenantId?: string;
      userId?: string;
      ip: string;
      emailHash?: string;
      requestId: string;
    },
  ): Promise<void> {
    try {
      if (!this.redisService.isReady()) {
        this.logger.warn('Redis not available for auth failure tracking');
        return;
      }

      const key = `auth:failure:${type}:${identifier}`;
      const windowSeconds = 3600; // 1 hour window for failure tracking

      // Increment failure counter
      const current = await this.redisService.incr(key);

      // Set expiry on first increment
      if (current === 1) {
        await this.redisService.expire(key, windowSeconds);
      }

      this.logger.debug(
        `Auth failure recorded: type=${type}, identifier=${identifier}, count=${current}`,
        { requestId: context.requestId },
      );

      // Check if threshold reached
      const threshold = this.configService.authFailureThreshold;
      if (current >= threshold) {
        await this.handleThresholdReached(current, type, context);
      }
    } catch (error) {
      this.logger.error(
        `Failed to record auth failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { requestId: context.requestId },
      );
    }
  }

  /**
   * Handle threshold reached
   * Emit security event and metrics
   */
  private async handleThresholdReached(
    failureCount: number,
    type: 'login' | 'password_reset' | 'email_verify' | 'token_refresh',
    context: {
      route: string;
      tenantId?: string;
      userId?: string;
      ip: string;
      emailHash?: string;
      requestId: string;
    },
  ): Promise<void> {
    const threshold = this.configService.authFailureThreshold;

    this.logger.warn(
      `Auth failure threshold reached: type=${type}, count=${failureCount}, threshold=${threshold}`,
      {
        requestId: context.requestId,
        route: context.route,
        type,
      },
    );

    // Emit security audit event
    this.securityAuditService.logAuthFailedThreshold({
      route: context.route,
      tenantId: context.tenantId,
      userId: context.userId,
      ipHash: this.securityAuditService.hashIp(context.ip),
      keyType: context.emailHash ? 'email-hash' : 'ip',
      requestId: context.requestId,
      failureCount,
      threshold,
      authType: type,
      emailHash: context.emailHash,
    });

    // Increment metrics
    this.metricsService.incrementAuthFailureThreshold(context.route, type);
  }

  /**
   * Reset failure count for an identifier
   * Call this on successful authentication
   */
  async resetFailures(
    identifier: string,
    type: 'login' | 'password_reset' | 'email_verify' | 'token_refresh',
  ): Promise<void> {
    try {
      if (!this.redisService.isReady()) {
        return;
      }

      const key = `auth:failure:${type}:${identifier}`;
      await this.redisService.del(key);

      this.logger.debug(`Auth failures reset: type=${type}, identifier=${identifier}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset auth failures: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get current failure count for an identifier
   */
  async getFailureCount(
    identifier: string,
    type: 'login' | 'password_reset' | 'email_verify' | 'token_refresh',
  ): Promise<number> {
    try {
      if (!this.redisService.isReady()) {
        return 0;
      }

      const key = `auth:failure:${type}:${identifier}`;
      const value = await this.redisService.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(
        `Failed to get failure count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  /**
   * Record login failure (convenience method)
   */
  async recordLoginFailure(
    ip: string,
    emailHash: string | undefined,
    tenantId: string | undefined,
    requestId: string,
  ): Promise<void> {
    // Track by IP
    await this.recordFailure(`ip:${ip}`, 'login', {
      route: '/api/v1/auth/login',
      tenantId,
      ip,
      emailHash,
      requestId,
    });

    // Track by email if available
    if (emailHash) {
      await this.recordFailure(`email:${emailHash}`, 'login', {
        route: '/api/v1/auth/login',
        tenantId,
        ip,
        emailHash,
        requestId,
      });
    }
  }
}
