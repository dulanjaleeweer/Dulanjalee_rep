import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, ERROR_MESSAGES } from '../rate-limit.constants';

/**
 * Exception thrown when rate limit is exceeded
 * Returns HTTP 429 with standard error body and Retry-After header
 */
export class RateLimitExceededException extends HttpException {
  constructor(
    public readonly retryAfterSeconds: number,
    message: string = ERROR_MESSAGES.RATE_LIMITED,
  ) {
    super(
      {
        error: ERROR_CODES.RATE_LIMITED,
        message,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Exception thrown when Redis is unavailable for auth endpoints
 * Returns HTTP 503 (fail-safe mode)
 */
export class RedisUnavailableException extends HttpException {
  constructor(message: string = ERROR_MESSAGES.REDIS_UNAVAILABLE) {
    super(
      {
        error: ERROR_CODES.REDIS_UNAVAILABLE,
        message,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
