import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';
import { RateLimitResult, RateLimitType, RateLimitConfig } from './rate-limit.interfaces';
import { DEFAULT_RATE_LIMITS } from './rate-limit.constants';

/**
 * Lua script for atomic increment and expiry
 * Returns [current_count, ttl_remaining]
 */
const INCR_AND_EXPIRE_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  local ttl = redis.call('TTL', KEYS[1])
  return {current, ttl}
`;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Check if a request is within rate limit
   * Uses atomic Lua script for INCR + EXPIRE
   */
  async checkLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      // Check Redis connection first
      if (!this.redisService.isReady()) {
        this.logger.warn('Redis not ready, failing rate limit check');
        throw new Error('Redis not connected');
      }

      // Execute atomic Lua script
      const result = (await this.redisService.eval(
        INCR_AND_EXPIRE_SCRIPT,
        [key],
        [windowSeconds],
      )) as [number, number];

      const [current, ttl] = result;

      // Calculate remaining requests
      const remaining = Math.max(0, limit - current);

      // If TTL is -1 (shouldn't happen with our script), use windowSeconds
      const effectiveTtl = ttl > 0 ? ttl : windowSeconds;

      // Calculate retry after (only relevant if limit exceeded)
      const retryAfter = current > limit ? effectiveTtl : 0;

      return {
        allowed: current <= limit,
        remaining,
        limit,
        retryAfter,
        current,
        key,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get configuration for a rate limit type
   * Uses environment variables when available, falls back to defaults
   */
  getConfigForType(type: RateLimitType): RateLimitConfig {
    switch (type) {
      case 'login':
        return {
          limit: this.configService.rateLimitLoginPerIp,
          windowSeconds: this.configService.rateLimitLoginPerIpWindow,
        };

      case 'loginEmail':
        return {
          limit: this.configService.rateLimitLoginPerEmail,
          windowSeconds: this.configService.rateLimitLoginPerEmailWindow,
        };

      case 'passwordReset':
        return {
          limit: this.configService.rateLimitPasswordResetPerIp,
          windowSeconds: this.configService.rateLimitPasswordResetPerIpWindow,
        };

      case 'emailVerifyResend':
        return {
          limit: this.configService.rateLimitEmailVerifyResendPerIp,
          windowSeconds: this.configService.rateLimitEmailVerifyResendPerIpWindow,
        };

      case 'refreshToken':
        return {
          limit: this.configService.rateLimitRefreshTokenPerUser,
          windowSeconds: this.configService.rateLimitRefreshTokenPerUserWindow,
        };

      case 'public':
        return {
          limit: this.configService.rateLimitPublicPerIp,
          windowSeconds: this.configService.rateLimitPublicPerIpWindow,
        };

      case 'sensitive':
        return {
          limit: this.configService.rateLimitSensitivePerUser,
          windowSeconds: this.configService.rateLimitSensitivePerUserWindow,
        };

      default:
        // For custom types, use public defaults as fallback
        return {
          limit: DEFAULT_RATE_LIMITS.public.perIp.limit,
          windowSeconds: DEFAULT_RATE_LIMITS.public.perIp.windowSeconds,
        };
    }
  }

  /**
   * Get burst limit configuration for login
   * Used for secondary key (IP-based burst protection)
   */
  getLoginBurstConfig(): RateLimitConfig {
    return {
      limit: this.configService.rateLimitLoginBurst,
      windowSeconds: this.configService.rateLimitLoginBurstWindow,
    };
  }

  /**
   * Get per-email configuration for password reset
   */
  getPasswordResetEmailConfig(): RateLimitConfig {
    return {
      limit: this.configService.rateLimitPasswordResetPerEmail,
      windowSeconds: this.configService.rateLimitPasswordResetPerEmailWindow,
    };
  }

  /**
   * Get per-email configuration for email verification resend
   */
  getEmailVerifyResendEmailConfig(): RateLimitConfig {
    return {
      limit: this.configService.rateLimitEmailVerifyResendPerEmail,
      windowSeconds: this.configService.rateLimitEmailVerifyResendPerEmailWindow,
    };
  }

  /**
   * Reset rate limit counter for a key
   * Useful for testing or manual unlock
   */
  async resetLimit(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get current count for a key without incrementing
   */
  async getCurrentCount(key: string): Promise<number> {
    try {
      const value = await this.redisService.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(
        `Failed to get count for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 0;
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redisService.isReady();
  }
}
