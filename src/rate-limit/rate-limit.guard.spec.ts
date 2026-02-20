import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { AppConfigService } from '../config/config.service';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { RateLimitOptions } from './rate-limit.interfaces';
import {
  RateLimitExceededException,
  RedisUnavailableException,
} from './exceptions/rate-limit.exception';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockRateLimitService = {
    checkLimit: jest.fn(),
    isRedisAvailable: jest.fn(),
    getConfigForType: jest.fn().mockReturnValue({ limit: 10, windowSeconds: 60 }),
    getPasswordResetEmailConfig: jest.fn().mockReturnValue({ limit: 5, windowSeconds: 900 }),
    getEmailVerifyResendEmailConfig: jest.fn().mockReturnValue({ limit: 3, windowSeconds: 900 }),
  };

  const mockSecurityAuditService = {
    logRateLimitBlocked: jest.fn(),
    logRedisUnavailable: jest.fn(),
    hashIp: jest.fn().mockReturnValue('hashed-ip'),
  };

  const mockMetricsService = {
    incrementRateLimitBlocked: jest.fn(),
    incrementRedisUnavailable: jest.fn(),
  };

  // Helper to create mock execution context
  const createMockContext = (options?: RateLimitOptions, body?: Record<string, unknown>) => {
    const mockRequest = {
      headers: {},
      query: {},
      body,
      socket: { remoteAddress: '192.168.1.1' },
    };

    const mockResponse = {
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validate: validateEnv,
          ignoreEnvFile: true,
        }),
      ],
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: SecurityAuditService,
          useValue: mockSecurityAuditService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        AppConfigService,
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request when no rate limit decorator', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when skip flag is set', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'custom',
        skip: true,
      });
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when under rate limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        limit: 10,
        retryAfter: 0,
        current: 5,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRateLimitService.checkLimit).toHaveBeenCalled();
    });

    it('should throw RateLimitExceededException when over limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        retryAfter: 45,
        current: 11,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(RateLimitExceededException);

      expect(mockSecurityAuditService.logRateLimitBlocked).toHaveBeenCalled();
      expect(mockMetricsService.incrementRateLimitBlocked).toHaveBeenCalled();
    });

    it('should throw RedisUnavailableException for auth endpoint when Redis is down', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(false);

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(RedisUnavailableException);

      expect(mockSecurityAuditService.logRedisUnavailable).toHaveBeenCalled();
      expect(mockMetricsService.incrementRedisUnavailable).toHaveBeenCalled();
    });

    it('should allow request for non-auth endpoint when Redis is down', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'public' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(false);

      const context = createMockContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSecurityAuditService.logRedisUnavailable).toHaveBeenCalled();
      expect(mockMetricsService.incrementRedisUnavailable).toHaveBeenCalled();
    });

    it('should check email-based limit for login with email', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 5,
          limit: 10,
          retryAfter: 0,
          current: 5,
          key: 'rl:auth:login:ip:192.168.1.1',
        })
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 3,
          limit: 5,
          retryAfter: 0,
          current: 2,
          key: 'rl:auth:login:email:hash123',
        });
      mockRateLimitService.getConfigForType.mockReturnValue({ limit: 5, windowSeconds: 60 });

      const context = createMockContext({ type: 'login' }, { email: 'test@example.com' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRateLimitService.checkLimit).toHaveBeenCalledTimes(2);
    });

    it('should use decorator limits over defaults', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        type: 'login',
        limit: 5,
        windowSeconds: 30,
      });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 4,
        limit: 5,
        retryAfter: 0,
        current: 1,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();
      await guard.canActivate(context);

      expect(mockRateLimitService.checkLimit).toHaveBeenCalledWith(expect.any(String), 5, 30);
    });

    it('should add rate limit headers to response', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        limit: 10,
        retryAfter: 0,
        current: 5,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();
      const mockResponse = context.switchToHttp().getResponse();

      await guard.canActivate(context);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);
    });

    it('should add Retry-After header when rate limited', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        retryAfter: 45,
        current: 11,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow();

      const mockResponse = context.switchToHttp().getResponse();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', 45);
    });

    it('should emit security event on rate limit block', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        retryAfter: 45,
        current: 11,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockSecurityAuditService.logRateLimitBlocked).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimitType: 'login',
          retryAfter: 45,
          currentCount: 11,
        }),
      );
    });

    it('should emit metrics on rate limit block', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ type: 'login' });
      mockRateLimitService.isRedisAvailable.mockReturnValue(true);
      mockRateLimitService.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        limit: 10,
        retryAfter: 45,
        current: 11,
        key: 'rl:auth:login:ip:192.168.1.1',
      });

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow();

      expect(mockMetricsService.incrementRateLimitBlocked).toHaveBeenCalled();
    });
  });
});
