/**
 * Security audit event interfaces
 * Structured events for security monitoring and compliance
 */

/**
 * Security event types
 */
export type SecurityEventType =
  | 'SECURITY_RATE_LIMIT_BLOCKED'
  | 'SECURITY_AUTH_FAILED_THRESHOLD_REACHED'
  | 'SECURITY_REDIS_UNAVAILABLE'
  | 'SECURITY_ANOMALY_DETECTED'
  | 'SECURITY_REGISTRATION_ATTEMPT';

/**
 * Base security audit event
 * All events extend this interface
 */
export interface SecurityAuditEvent {
  /** Event type classification */
  eventType: SecurityEventType;

  /** API route/path that triggered the event */
  route: string;

  /** Tenant ID if available */
  tenantId?: string;

  /** User ID if authenticated */
  userId?: string;

  /** Hashed IP address (SHA-256) for privacy */
  ipHash: string;

  /** Type of key that triggered the rate limit */
  keyType: 'ip' | 'user' | 'email-hash' | 'token';

  /** Request correlation ID for tracing */
  requestId: string;

  /** ISO-8601 timestamp */
  timestamp: string;
}

/**
 * Rate limit blocked event
 * Emitted when a request is blocked due to rate limiting
 */
export interface RateLimitBlockedEvent extends SecurityAuditEvent {
  eventType: 'SECURITY_RATE_LIMIT_BLOCKED';

  /** Rate limit type (login, public, sensitive, etc.) */
  rateLimitType: string;

  /** The limit that was exceeded */
  limit: number;

  /** Time window in seconds */
  windowSeconds: number;

  /** Seconds until retry is allowed */
  retryAfter: number;

  /** Current count at time of block */
  currentCount: number;
}

/**
 * Auth failed threshold reached event
 * Emitted when consecutive auth failures exceed threshold
 */
export interface AuthFailedThresholdEvent extends SecurityAuditEvent {
  eventType: 'SECURITY_AUTH_FAILED_THRESHOLD_REACHED';

  /** Number of consecutive failures */
  failureCount: number;

  /** Threshold that was reached */
  threshold: number;

  /** Type of authentication that failed */
  authType: 'login' | 'password_reset' | 'email_verify' | 'token_refresh';

  /** Hashed email if email-based auth */
  emailHash?: string;
}

/**
 * Redis unavailable event
 * Emitted when Redis is unavailable for auth/recovery endpoints
 */
export interface RedisUnavailableEvent extends SecurityAuditEvent {
  eventType: 'SECURITY_REDIS_UNAVAILABLE';

  /** Whether the endpoint is auth/recovery (fail-safe) or not (fail-open) */
  isAuthEndpoint: boolean;

  /** Error message (sanitized) */
  errorMessage: string;
}

/**
 * Anomaly detected event
 * For future ML-based anomaly detection
 */
export interface AnomalyDetectedEvent extends SecurityAuditEvent {
  eventType: 'SECURITY_ANOMALY_DETECTED';

  /** Anomaly score or confidence */
  anomalyScore: number;

  /** Description of detected anomaly */
  description: string;
}

/**
 * Registration attempt outcome
 */
export type RegistrationOutcome = 'created' | 'duplicate' | 'validation_failed' | 'error';

/**
 * Registration attempt event
 * Emitted for every registration attempt with PII-safe fields only
 */
export interface RegistrationAttemptEvent extends SecurityAuditEvent {
  eventType: 'SECURITY_REGISTRATION_ATTEMPT';

  /** Outcome of the registration attempt */
  outcome: RegistrationOutcome;

  /** Hashed email (SHA-256, truncated) — distinct from ipHash */
  emailHash: string;

  /** Requested role (not PII) */
  role?: string;

  /** Tenant type created (only on success) */
  tenantType?: string;

  /** Validation error messages (policy rules, no PII) */
  validationErrors?: string[];
}

/**
 * Union type of all security events
 */
export type SecurityEvent =
  | RateLimitBlockedEvent
  | AuthFailedThresholdEvent
  | RedisUnavailableEvent
  | AnomalyDetectedEvent
  | RegistrationAttemptEvent;

/**
 * Security audit logger interface
 */
export interface ISecurityAuditLogger {
  logEvent(event: SecurityEvent): void;
  logRateLimitBlocked(event: Omit<RateLimitBlockedEvent, 'eventType' | 'timestamp'>): void;
  logAuthFailedThreshold(event: Omit<AuthFailedThresholdEvent, 'eventType' | 'timestamp'>): void;
  logRedisUnavailable(event: Omit<RedisUnavailableEvent, 'eventType' | 'timestamp'>): void;
  logRegistrationAttempt(event: Omit<RegistrationAttemptEvent, 'eventType' | 'timestamp'>): void;
}
