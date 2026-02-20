import { SetMetadata } from '@nestjs/common';
import { RateLimitOptions, RateLimitType } from './rate-limit.interfaces';
import { RATE_LIMIT_METADATA_KEY } from './rate-limit.constants';

/**
 * Rate limit decorator
 * Apply to controller methods to enable rate limiting
 *
 * @example
 * // Use default configuration for login type
 * @RateLimit('login')
 * async login(@Body() dto: LoginDto) { ... }
 *
 * @example
 * // Override defaults
 * @RateLimit({
 *   type: 'login',
 *   limit: 5,
 *   windowSeconds: 60
 * })
 * async login(@Body() dto: LoginDto) { ... }
 *
 * @example
 * // Custom key extraction
 * @RateLimit({
 *   type: 'custom',
 *   customKeyPrefix: 'my-feature',
 *   tenantIdExtractor: (req) => req.headers['x-custom-tenant']
 * })
 * async myEndpoint() { ... }
 */
export const RateLimit = (options: RateLimitType | RateLimitOptions): MethodDecorator => {
  const normalizedOptions: RateLimitOptions =
    typeof options === 'string' ? { type: options } : options;

  return SetMetadata(RATE_LIMIT_METADATA_KEY, normalizedOptions);
};

/**
 * Skip rate limiting decorator
 * Useful for health checks or exempt endpoints
 */
export const SkipRateLimit = (): MethodDecorator =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, { type: 'custom', skip: true } as RateLimitOptions);
