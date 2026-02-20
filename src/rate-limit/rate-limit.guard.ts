import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { AppConfigService } from '../config/config.service';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { RateLimitOptions, RateLimitType, RateLimitKeyComponents } from './rate-limit.interfaces';
import { RATE_LIMIT_METADATA_KEY } from './rate-limit.constants';
import {
  RateLimitExceededException,
  RedisUnavailableException,
} from './exceptions/rate-limit.exception';
import {
  extractClientIp,
  hashEmail,
  buildRateLimitKey,
  extractTenantId,
  extractUserId,
  extractBodyValue,
} from './rate-limit.utils';

/**
 * Guard that enforces rate limits on routes decorated with @RateLimit()
 * Supports multiple key strategies and handles Redis failures gracefully
 * Emits security audit events and metrics for observability
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: AppConfigService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly metricsService: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get rate limit options from decorator metadata
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no decorator or skip flag set, allow request
    if (!options || options.skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestId = this.extractRequestId(request);

    // Determine if this is an auth/recovery endpoint (fail-safe)
    const isAuthEndpoint = this.isAuthEndpoint(options.type);

    // Check Redis availability
    if (!this.rateLimitService.isRedisAvailable()) {
      if (isAuthEndpoint) {
        this.logger.warn(`Redis unavailable for auth endpoint, failing safe (503)`, {
          requestId,
          type: options.type,
        });

        // Emit security audit event
        this.securityAuditService.logRedisUnavailable({
          route: request.route?.path || request.path,
          tenantId: extractTenantId(request),
          userId: extractUserId(request),
          ipHash: this.securityAuditService.hashIp(
            extractClientIp(request, {
              trustedProxies: this.configService.trustedProxyIps,
              trustProxy: this.configService.trustedProxyIps.length > 0,
            }),
          ),
          keyType: 'ip',
          requestId,
          isAuthEndpoint: true,
          errorMessage: 'Redis not available for auth endpoint',
        });

        // Increment metrics
        this.metricsService.incrementRedisUnavailable('auth');

        throw new RedisUnavailableException();
      } else {
        this.logger.warn(`Redis unavailable for non-auth endpoint, failing open`, {
          requestId,
          type: options.type,
        });

        // Emit security audit event (informational)
        this.securityAuditService.logRedisUnavailable({
          route: request.route?.path || request.path,
          tenantId: extractTenantId(request),
          userId: extractUserId(request),
          ipHash: this.securityAuditService.hashIp(
            extractClientIp(request, {
              trustedProxies: this.configService.trustedProxyIps,
              trustProxy: this.configService.trustedProxyIps.length > 0,
            }),
          ),
          keyType: 'ip',
          requestId,
          isAuthEndpoint: false,
          errorMessage: 'Redis not available for non-auth endpoint',
        });

        // Increment metrics
        this.metricsService.incrementRedisUnavailable('non-auth');

        return true;
      }
    }

    // Extract key components
    const keyComponents = this.extractKeyComponents(request, options);

    // Build primary rate limit key
    const primaryKey = buildRateLimitKey(keyComponents);

    // Get configuration
    const config = this.getEffectiveConfig(options);

    // Check primary rate limit
    const primaryResult = await this.rateLimitService.checkLimit(
      primaryKey,
      config.limit,
      config.windowSeconds,
    );

    // Add rate limit headers to response
    this.addRateLimitHeaders(context, primaryResult);

    // If primary limit exceeded, reject and emit events
    if (!primaryResult.allowed) {
      const route = request.route?.path || request.path;

      this.logger.warn(
        `Rate limit exceeded: type=${options.type}, key=${primaryKey}, count=${primaryResult.current}/${config.limit}`,
        {
          requestId,
          type: options.type,
          keyType: this.getKeyTypeDescription(keyComponents),
          limit: config.limit,
          windowSeconds: config.windowSeconds,
          retryAfter: primaryResult.retryAfter,
        },
      );

      // Emit security audit event (PII-safe)
      this.securityAuditService.logRateLimitBlocked({
        route,
        tenantId: keyComponents.tenantId,
        userId: keyComponents.userId,
        ipHash: this.securityAuditService.hashIp(keyComponents.ip),
        keyType: this.getKeyTypeDescription(keyComponents) as
          | 'ip'
          | 'user'
          | 'email-hash'
          | 'token',
        requestId,
        rateLimitType: options.type,
        limit: config.limit,
        windowSeconds: config.windowSeconds,
        retryAfter: primaryResult.retryAfter,
        currentCount: primaryResult.current,
      });

      // Increment metrics
      this.metricsService.incrementRateLimitBlocked(route, options.type);

      throw new RateLimitExceededException(primaryResult.retryAfter);
    }

    // For login endpoints, also check email-based limit if email provided
    if (options.type === 'login' && keyComponents.emailHash) {
      const emailResult = await this.checkEmailBasedLimit(
        request,
        keyComponents,
        requestId,
        context,
      );

      if (!emailResult.allowed) {
        throw new RateLimitExceededException(emailResult.retryAfter);
      }
    }

    // For password reset, also check email-based limit
    if (options.type === 'passwordReset' && keyComponents.emailHash) {
      const emailResult = await this.checkPasswordResetEmailLimit(
        request,
        keyComponents,
        requestId,
        context,
      );

      if (!emailResult.allowed) {
        throw new RateLimitExceededException(emailResult.retryAfter);
      }
    }

    // For email verification resend, also check email-based limit
    if (options.type === 'emailVerifyResend' && keyComponents.emailHash) {
      const emailResult = await this.checkEmailVerifyResendLimit(
        request,
        keyComponents,
        requestId,
        context,
      );

      if (!emailResult.allowed) {
        throw new RateLimitExceededException(emailResult.retryAfter);
      }
    }

    return true;
  }

  /**
   * Extract key components from request based on options
   */
  private extractKeyComponents(
    request: Request,
    options: RateLimitOptions,
  ): RateLimitKeyComponents {
    // Extract tenant ID
    const tenantId = options.tenantIdExtractor
      ? options.tenantIdExtractor(request as unknown as Record<string, unknown>)
      : extractTenantId(request);

    // Extract user ID (for authenticated endpoints)
    const userId = options.userIdExtractor
      ? options.userIdExtractor(request as unknown as Record<string, unknown>)
      : extractUserId(request);

    // Extract and normalize IP
    const ip = extractClientIp(request, {
      trustedProxies: this.configService.trustedProxyIps,
      trustProxy: this.configService.trustedProxyIps.length > 0,
    });

    // Extract and hash email if applicable
    let emailHash: string | undefined;
    if (
      options.type === 'login' ||
      options.type === 'loginEmail' ||
      options.type === 'passwordReset' ||
      options.type === 'emailVerifyResend'
    ) {
      const email = options.emailExtractor
        ? options.emailExtractor(request as unknown as Record<string, unknown>)
        : extractBodyValue(request, 'email');
      emailHash = hashEmail(email);
    }

    return {
      type: options.type,
      tenantId,
      userId,
      ip,
      emailHash,
      customSuffix: options.customKeyPrefix,
    };
  }

  /**
   * Get effective configuration (decorator overrides > env vars > defaults)
   */
  private getEffectiveConfig(options: RateLimitOptions): {
    limit: number;
    windowSeconds: number;
  } {
    const defaultConfig = this.rateLimitService.getConfigForType(options.type);

    return {
      limit: options.limit ?? defaultConfig.limit,
      windowSeconds: options.windowSeconds ?? defaultConfig.windowSeconds,
    };
  }

  /**
   * Check email-based rate limit for login
   */
  private async checkEmailBasedLimit(
    request: Request,
    components: RateLimitKeyComponents,
    requestId: string,
    _context: ExecutionContext,
  ) {
    const emailKey = buildRateLimitKey({
      ...components,
      type: 'loginEmail',
    });

    const emailConfig = this.rateLimitService.getConfigForType('loginEmail');

    const result = await this.rateLimitService.checkLimit(
      emailKey,
      emailConfig.limit,
      emailConfig.windowSeconds,
    );

    if (!result.allowed) {
      const route = request.route?.path || request.path;

      this.logger.warn(
        `Login email rate limit exceeded: key=${emailKey}, count=${result.current}/${emailConfig.limit}`,
        {
          requestId,
          type: 'loginEmail',
          limit: emailConfig.limit,
          retryAfter: result.retryAfter,
        },
      );

      // Emit security audit event
      this.securityAuditService.logRateLimitBlocked({
        route,
        tenantId: components.tenantId,
        userId: components.userId,
        ipHash: this.securityAuditService.hashIp(components.ip),
        keyType: 'email-hash',
        requestId,
        rateLimitType: 'loginEmail',
        limit: emailConfig.limit,
        windowSeconds: emailConfig.windowSeconds,
        retryAfter: result.retryAfter,
        currentCount: result.current,
      });

      // Increment metrics
      this.metricsService.incrementRateLimitBlocked(route, 'loginEmail');
    }

    return result;
  }

  /**
   * Check email-based rate limit for password reset
   */
  private async checkPasswordResetEmailLimit(
    request: Request,
    components: RateLimitKeyComponents,
    requestId: string,
    _context: ExecutionContext,
  ) {
    const emailKey = buildRateLimitKey({
      ...components,
      type: 'loginEmail', // Reuse email key pattern
      customSuffix: 'pwreset-email',
    });

    const emailConfig = this.rateLimitService.getPasswordResetEmailConfig();

    const result = await this.rateLimitService.checkLimit(
      emailKey,
      emailConfig.limit,
      emailConfig.windowSeconds,
    );

    if (!result.allowed) {
      const route = request.route?.path || request.path;

      this.logger.warn(
        `Password reset email rate limit exceeded: key=${emailKey}, count=${result.current}/${emailConfig.limit}`,
        {
          requestId,
          type: 'passwordResetEmail',
          limit: emailConfig.limit,
          retryAfter: result.retryAfter,
        },
      );

      // Emit security audit event
      this.securityAuditService.logRateLimitBlocked({
        route,
        tenantId: components.tenantId,
        userId: components.userId,
        ipHash: this.securityAuditService.hashIp(components.ip),
        keyType: 'email-hash',
        requestId,
        rateLimitType: 'passwordResetEmail',
        limit: emailConfig.limit,
        windowSeconds: emailConfig.windowSeconds,
        retryAfter: result.retryAfter,
        currentCount: result.current,
      });

      // Increment metrics
      this.metricsService.incrementRateLimitBlocked(route, 'passwordResetEmail');
    }

    return result;
  }

  /**
   * Check email-based rate limit for email verification resend
   */
  private async checkEmailVerifyResendLimit(
    request: Request,
    components: RateLimitKeyComponents,
    requestId: string,
    _context: ExecutionContext,
  ) {
    const emailKey = buildRateLimitKey({
      ...components,
      type: 'loginEmail',
      customSuffix: 'email-verify-resend',
    });

    const emailConfig = this.rateLimitService.getEmailVerifyResendEmailConfig();

    const result = await this.rateLimitService.checkLimit(
      emailKey,
      emailConfig.limit,
      emailConfig.windowSeconds,
    );

    if (!result.allowed) {
      const route = request.route?.path || request.path;

      this.logger.warn(
        `Email verify resend rate limit exceeded: key=${emailKey}, count=${result.current}/${emailConfig.limit}`,
        {
          requestId,
          type: 'emailVerifyResendEmail',
          limit: emailConfig.limit,
          retryAfter: result.retryAfter,
        },
      );

      // Emit security audit event
      this.securityAuditService.logRateLimitBlocked({
        route,
        tenantId: components.tenantId,
        userId: components.userId,
        ipHash: this.securityAuditService.hashIp(components.ip),
        keyType: 'email-hash',
        requestId,
        rateLimitType: 'emailVerifyResendEmail',
        limit: emailConfig.limit,
        windowSeconds: emailConfig.windowSeconds,
        retryAfter: result.retryAfter,
        currentCount: result.current,
      });

      // Increment metrics
      this.metricsService.incrementRateLimitBlocked(route, 'emailVerifyResendEmail');
    }

    return result;
  }

  /**
   * Determine if endpoint is auth/recovery (fail-safe) or not (fail-open)
   */
  private isAuthEndpoint(type: RateLimitType): boolean {
    const authTypes: RateLimitType[] = [
      'login',
      'loginEmail',
      'passwordReset',
      'passwordResetConfirm',
      'emailVerifyResend',
      'emailVerifyToken',
      'refreshToken',
    ];
    return authTypes.includes(type);
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(
    context: ExecutionContext,
    result: { remaining: number; limit: number; retryAfter: number },
  ): void {
    const response = context.switchToHttp().getResponse();

    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));

    if (result.retryAfter > 0) {
      response.setHeader('Retry-After', result.retryAfter);
    }
  }

  /**
   * Extract request ID from request for logging
   */
  private extractRequestId(request: Request): string {
    return (
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      'unknown'
    );
  }

  /**
   * Get description of key type for logging (PII-safe)
   */
  private getKeyTypeDescription(components: RateLimitKeyComponents): string {
    if (components.userId) return 'user';
    if (components.emailHash) return 'email-hash';
    if (components.ip) return 'ip';
    return 'unknown';
  }
}
