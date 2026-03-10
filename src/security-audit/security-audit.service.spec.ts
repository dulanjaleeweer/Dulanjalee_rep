import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditService } from './security-audit.service';
import {
  RateLimitBlockedEvent,
  AuthFailedThresholdEvent,
  RedisUnavailableEvent,
  RegistrationAttemptEvent,
} from './security-audit.interfaces';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityAuditService],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashIp', () => {
    it('should hash IP address consistently', () => {
      const ip = '192.168.1.1';
      const hash1 = service.hashIp(ip);
      const hash2 = service.hashIp(ip);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = service.hashIp('192.168.1.1');
      const hash2 = service.hashIp('192.168.1.2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashEmail', () => {
    it('should hash email consistently', () => {
      const email = 'test@example.com';
      const hash1 = service.hashEmail(email);
      const hash2 = service.hashEmail(email);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should normalize email before hashing', () => {
      const hash1 = service.hashEmail('Test@Example.COM');
      const hash2 = service.hashEmail('test@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = service.hashEmail('  test@example.com  ');
      const hash2 = service.hashEmail('test@example.com');

      expect(hash1).toBe(hash2);
    });
  });

  describe('logRateLimitBlocked', () => {
    it('should log rate limit blocked event', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      const eventData = {
        route: '/api/v1/auth/login',
        tenantId: 'tenant-123',
        userId: 'user-456',
        ipHash: 'abc123hash',
        keyType: 'ip' as const,
        requestId: 'req-789',
        rateLimitType: 'login',
        limit: 10,
        windowSeconds: 60,
        retryAfter: 45,
        currentCount: 15,
      };

      service.logRateLimitBlocked(eventData);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedArg = consoleSpy.mock.calls[0][1] as RateLimitBlockedEvent;
      expect(loggedArg.eventType).toBe('SECURITY_RATE_LIMIT_BLOCKED');
      expect(loggedArg.route).toBe(eventData.route);
      expect(loggedArg.rateLimitType).toBe(eventData.rateLimitType);
      expect(loggedArg.timestamp).toBeDefined();
    });
  });

  describe('logAuthFailedThreshold', () => {
    it('should log auth failed threshold event', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      const eventData = {
        route: '/api/v1/auth/login',
        tenantId: 'tenant-123',
        userId: undefined,
        ipHash: 'abc123hash',
        keyType: 'ip' as const,
        requestId: 'req-789',
        failureCount: 5,
        threshold: 5,
        authType: 'login' as const,
        emailHash: 'emailhash123',
      };

      service.logAuthFailedThreshold(eventData);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedArg = consoleSpy.mock.calls[0][1] as AuthFailedThresholdEvent;
      expect(loggedArg.eventType).toBe('SECURITY_AUTH_FAILED_THRESHOLD_REACHED');
      expect(loggedArg.failureCount).toBe(eventData.failureCount);
      expect(loggedArg.threshold).toBe(eventData.threshold);
    });
  });

  describe('logRedisUnavailable', () => {
    it('should log Redis unavailable event', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      const eventData = {
        route: '/api/v1/auth/login',
        tenantId: 'tenant-123',
        userId: 'user-456',
        ipHash: 'abc123hash',
        keyType: 'ip' as const,
        requestId: 'req-789',
        isAuthEndpoint: true,
        errorMessage: 'Redis connection failed',
      };

      service.logRedisUnavailable(eventData);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedArg = consoleSpy.mock.calls[0][1] as RedisUnavailableEvent;
      expect(loggedArg.eventType).toBe('SECURITY_REDIS_UNAVAILABLE');
      expect(loggedArg.isAuthEndpoint).toBe(true);
    });
  });

  describe('logRegistrationAttempt', () => {
    it('should log registration attempt event with correct eventType', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      const eventData = {
        route: '/api/v1/auth/register',
        ipHash: 'iphash123',
        emailHash: 'emailhash456',
        keyType: 'email-hash' as const,
        requestId: 'req-001',
        outcome: 'created' as const,
        role: 'FAMILY_OWNER',
        tenantType: 'FAMILY',
      };

      service.logRegistrationAttempt(eventData);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedArg = consoleSpy.mock.calls[0][1] as RegistrationAttemptEvent;
      expect(loggedArg.eventType).toBe('SECURITY_REGISTRATION_ATTEMPT');
      expect(loggedArg.outcome).toBe('created');
      expect(loggedArg.emailHash).toBe('emailhash456');
      expect(loggedArg.role).toBe('FAMILY_OWNER');
      expect(loggedArg.tenantType).toBe('FAMILY');
      expect(loggedArg.timestamp).toBeDefined();
    });

    it('should log duplicate outcome without userId or tenantId', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      service.logRegistrationAttempt({
        route: '/api/v1/auth/register',
        ipHash: 'iphash123',
        emailHash: 'emailhash456',
        keyType: 'email-hash',
        requestId: 'req-002',
        outcome: 'duplicate',
      });

      const loggedArg = consoleSpy.mock.calls[0][1] as RegistrationAttemptEvent;
      expect(loggedArg.outcome).toBe('duplicate');
      expect(loggedArg.userId).toBeUndefined();
      expect(loggedArg.tenantId).toBeUndefined();
    });

    it('should log validation_failed outcome with error messages', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'warn');

      service.logRegistrationAttempt({
        route: '/api/v1/auth/register',
        ipHash: 'iphash123',
        emailHash: 'emailhash456',
        keyType: 'email-hash',
        requestId: 'req-003',
        outcome: 'validation_failed',
        validationErrors: ['Password must be at least 12 characters'],
      });

      const loggedArg = consoleSpy.mock.calls[0][1] as RegistrationAttemptEvent;
      expect(loggedArg.outcome).toBe('validation_failed');
      expect(loggedArg.validationErrors).toEqual(['Password must be at least 12 characters']);
    });
  });
});
