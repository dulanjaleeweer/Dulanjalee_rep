/**
 * Rate limiting interfaces and types
 */

/**
 * Types of rate limits supported
 */
export type RateLimitType =
  | 'login' // Login attempts per IP
  | 'loginEmail' // Login attempts per email
  | 'passwordReset' // Password reset requests
  | 'passwordResetConfirm' // Password reset confirmations
  | 'emailVerifyResend' // Email verification resends
  | 'emailVerifyToken' // Email verification token checks
  | 'refreshToken' // Token refresh
  | 'public' // Public API endpoints
  | 'sensitive' // Sensitive authenticated endpoints
  | 'custom'; // Custom key strategy

/**
 * Options for the @RateLimit() decorator
 */
export interface RateLimitOptions {
  /** Type of rate limit to apply */
  type: RateLimitType;

  /** Custom key prefix for 'custom' type */
  customKeyPrefix?: string;

  /** Override default limit (number of requests) */
  limit?: number;

  /** Override default window in seconds */
  windowSeconds?: number;

  /** Extract tenant ID from request (default: header 'x-tenant-id') */
  tenantIdExtractor?: (request: Record<string, unknown>) => string | undefined;

  /** Extract user ID from request (default: req.user.id) */
  userIdExtractor?: (request: Record<string, unknown>) => string | undefined;

  /** Extract email from request for hashing (default: req.body.email) */
  emailExtractor?: (request: Record<string, unknown>) => string | undefined;

  /** Whether to skip rate limiting (useful for feature flags) */
  skip?: boolean;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Number of requests remaining in current window */
  remaining: number;

  /** Total limit for this window */
  limit: number;

  /** Seconds until the window resets */
  retryAfter: number;

  /** Current count in the window */
  current: number;

  /** The Redis key used for this check */
  key: string;
}

/**
 * Configuration for a rate limit type
 */
export interface RateLimitConfig {
  /** Number of requests allowed */
  limit: number;

  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * Key components extracted from request
 */
export interface RateLimitKeyComponents {
  /** Rate limit type */
  type: RateLimitType;

  /** Tenant ID if available */
  tenantId?: string;

  /** User ID if available */
  userId?: string;

  /** Client IP address (normalized) */
  ip: string;

  /** Hashed email if applicable */
  emailHash?: string;

  /** Custom key suffix if applicable */
  customSuffix?: string;
}

/**
 * HTTP headers returned with rate limit responses
 */
export interface RateLimitHeaders {
  /** Remaining requests in current window */
  'X-RateLimit-Remaining': number;

  /** Total limit per window */
  'X-RateLimit-Limit': number;

  /** Seconds until window resets */
  'X-RateLimit-Reset': number;

  /** Retry after seconds (only on 429) */
  'Retry-After'?: number;
}

/**
 * IP extraction configuration
 */
export interface IpExtractionConfig {
  /** List of trusted proxy IPs/CIDRs */
  trustedProxies: string[];

  /** Header to check for client IP (default: x-forwarded-for) */
  headerName?: string;

  /** Whether to trust the proxy chain */
  trustProxy?: boolean;
}
