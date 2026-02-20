/**
 * Constants for rate limiting module
 */

/**
 * Injection tokens
 */
export const RATE_LIMIT_OPTIONS = Symbol('RATE_LIMIT_OPTIONS');

/**
 * Metadata key for rate limit decorator
 */
export const RATE_LIMIT_METADATA_KEY = 'rate_limit_metadata';

/**
 * Redis key prefixes
 */
export const RATE_LIMIT_KEY_PREFIXES = {
  AUTH_LOGIN: 'rl:auth:login',
  AUTH_PASSWORD_RESET: 'rl:auth:pwreset',
  AUTH_EMAIL_VERIFY: 'rl:auth:emailverify',
  AUTH_TOKEN: 'rl:auth:token',
  AUTH_REFRESH: 'rl:auth:refresh',
  API_PUBLIC: 'rl:api:public',
  API_SENSITIVE: 'rl:api:sensitive',
  CUSTOM: 'rl:custom',
} as const;

/**
 * Default rate limit configurations
 * These are used when no explicit configuration is provided
 * and can be overridden via environment variables
 */
export const DEFAULT_RATE_LIMITS = {
  login: {
    perIp: { limit: 10, windowSeconds: 60 },
    perEmail: { limit: 5, windowSeconds: 60 },
    burst: { limit: 30, windowSeconds: 600 },
  },
  passwordReset: {
    perIp: { limit: 20, windowSeconds: 900 },
    perEmail: { limit: 5, windowSeconds: 900 },
  },
  emailVerifyResend: {
    perIp: { limit: 10, windowSeconds: 900 },
    perEmail: { limit: 3, windowSeconds: 900 },
  },
  emailVerifyToken: {
    perIp: { limit: 10, windowSeconds: 60 },
  },
  refreshToken: {
    perUser: { limit: 30, windowSeconds: 60 },
  },
  public: {
    perIp: { limit: 120, windowSeconds: 60 },
  },
  sensitive: {
    perUser: { limit: 300, windowSeconds: 60 },
  },
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  RATE_LIMITED: 'rate_limited',
  REDIS_UNAVAILABLE: 'redis_unavailable',
} as const;

/**
 * Default error messages
 */
export const ERROR_MESSAGES = {
  RATE_LIMITED: 'Too many requests. Please try again later.',
  REDIS_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
} as const;
