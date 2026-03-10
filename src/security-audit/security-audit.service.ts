import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  SecurityEvent,
  RateLimitBlockedEvent,
  AuthFailedThresholdEvent,
  RedisUnavailableEvent,
  RegistrationAttemptEvent,
  ISecurityAuditLogger,
} from './security-audit.interfaces';

/**
 * Security audit service
 * Emits structured security events for monitoring and compliance
 * All PII is hashed before logging
 */
@Injectable()
export class SecurityAuditService implements ISecurityAuditLogger {
  private readonly logger = new Logger(SecurityAuditService.name);

  /**
   * Hash a string (IP, email, etc.) for privacy
   */
  private hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  /**
   * Log a generic security event
   */
  logEvent(event: SecurityEvent): void {
    // Ensure timestamp is set
    const eventWithTimestamp: SecurityEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // Log as structured JSON
    this.logger.warn(`Security event: ${eventWithTimestamp.eventType}`, eventWithTimestamp);

    // TODO: Integrate with external SIEM or audit log storage
    // Example: await this.auditLogRepository.save(eventWithTimestamp);
    // Example: await this.eventBridge.putEvents({...});
  }

  /**
   * Log rate limit blocked event
   */
  logRateLimitBlocked(event: Omit<RateLimitBlockedEvent, 'eventType' | 'timestamp'>): void {
    const fullEvent: RateLimitBlockedEvent = {
      ...event,
      eventType: 'SECURITY_RATE_LIMIT_BLOCKED',
      timestamp: new Date().toISOString(),
    };

    this.logEvent(fullEvent);
  }

  /**
   * Log auth failed threshold reached event
   */
  logAuthFailedThreshold(event: Omit<AuthFailedThresholdEvent, 'eventType' | 'timestamp'>): void {
    const fullEvent: AuthFailedThresholdEvent = {
      ...event,
      eventType: 'SECURITY_AUTH_FAILED_THRESHOLD_REACHED',
      timestamp: new Date().toISOString(),
    };

    this.logEvent(fullEvent);
  }

  /**
   * Log Redis unavailable event
   */
  logRedisUnavailable(event: Omit<RedisUnavailableEvent, 'eventType' | 'timestamp'>): void {
    const fullEvent: RedisUnavailableEvent = {
      ...event,
      eventType: 'SECURITY_REDIS_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    };

    this.logEvent(fullEvent);
  }

  /**
   * Log registration attempt event
   */
  logRegistrationAttempt(event: Omit<RegistrationAttemptEvent, 'eventType' | 'timestamp'>): void {
    const fullEvent: RegistrationAttemptEvent = {
      ...event,
      eventType: 'SECURITY_REGISTRATION_ATTEMPT',
      timestamp: new Date().toISOString(),
    };

    this.logEvent(fullEvent);
  }

  /**
   * Create a hash of an IP address
   */
  hashIp(ip: string): string {
    return this.hashString(ip);
  }

  /**
   * Create a hash of an email address
   */
  hashEmail(email: string): string {
    return this.hashString(email.toLowerCase().trim());
  }
}
