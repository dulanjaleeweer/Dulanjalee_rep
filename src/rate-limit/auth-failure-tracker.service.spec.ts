import { Test, TestingModule } from '@nestjs/testing';
import { AuthFailureTrackerService } from './auth-failure-tracker.service';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';
import { SecurityAuditService } from '../security-audit/security-audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('AuthFailureTrackerService', () => {
  let service: AuthFailureTrackerService;

  const mockRedisService = {
    isReady: jest.fn().mockReturnValue(true),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  };

  const mockSecurityAuditService = {
    logAuthFailedThreshold: jest.fn(),
    hashIp: jest.fn().mockReturnValue('hashed-ip'),
  };

  const mockMetricsService = {
    incrementAuthFailureThreshold: jest.fn(),
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
        AuthFailureTrackerService,
        {
          provide: RedisService,
          useValue: mockRedisService,
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

    service = module.get<AuthFailureTrackerService>(AuthFailureTrackerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFailure', () => {
    it('should record failure and set expiry on first increment', async () => {
      mockRedisService.incr.mockResolvedValue(1);

      await service.recordFailure('ip:192.168.1.1', 'login', {
        route: '/api/v1/auth/login',
        ip: '192.168.1.1',
        requestId: 'req-123',
      });

      expect(mockRedisService.incr).toHaveBeenCalledWith('auth:failure:login:ip:192.168.1.1');
      expect(mockRedisService.expire).toHaveBeenCalledWith(
        'auth:failure:login:ip:192.168.1.1',
        3600,
      );
    });

    it('should not set expiry on subsequent increments', async () => {
      mockRedisService.incr.mockResolvedValue(2);

      await service.recordFailure('ip:192.168.1.1', 'login', {
        route: '/api/v1/auth/login',
        ip: '192.168.1.1',
        requestId: 'req-123',
      });

      expect(mockRedisService.expire).not.toHaveBeenCalled();
    });

    it('should emit security event when threshold reached', async () => {
      mockRedisService.incr.mockResolvedValue(5);

      await service.recordFailure('ip:192.168.1.1', 'login', {
        route: '/api/v1/auth/login',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        requestId: 'req-123',
      });

      expect(mockSecurityAuditService.logAuthFailedThreshold).toHaveBeenCalled();
      expect(mockMetricsService.incrementAuthFailureThreshold).toHaveBeenCalled();
    });

    it('should handle Redis not ready gracefully', async () => {
      mockRedisService.isReady.mockReturnValue(false);

      await service.recordFailure('ip:192.168.1.1', 'login', {
        route: '/api/v1/auth/login',
        ip: '192.168.1.1',
        requestId: 'req-123',
      });

      expect(mockRedisService.incr).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.incr.mockRejectedValue(new Error('Redis error'));

      await service.recordFailure('ip:192.168.1.1', 'login', {
        route: '/api/v1/auth/login',
        ip: '192.168.1.1',
        requestId: 'req-123',
      });

      // Should not throw and incr should have been called
      expect(mockRedisService.incr).toHaveBeenCalledWith('auth:failure:login:ip:192.168.1.1');
    });
  });

  describe('resetFailures', () => {
    it('should delete failure key when Redis is ready', async () => {
      mockRedisService.isReady.mockReturnValue(true);

      await service.resetFailures('ip:192.168.1.1', 'login');

      expect(mockRedisService.del).toHaveBeenCalledWith('auth:failure:login:ip:192.168.1.1');
    });

    it('should handle Redis not ready gracefully', async () => {
      mockRedisService.isReady.mockReturnValue(false);

      await service.resetFailures('ip:192.168.1.1', 'login');

      expect(mockRedisService.del).not.toHaveBeenCalled();
    });
  });

  describe('getFailureCount', () => {
    it('should return count from Redis', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.get.mockResolvedValue('3');

      const count = await service.getFailureCount('ip:192.168.1.1', 'login');

      expect(count).toBe(3);
    });

    it('should return 0 when key does not exist', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.get.mockResolvedValue(null);

      const count = await service.getFailureCount('ip:192.168.1.1', 'login');

      expect(count).toBe(0);
    });

    it('should return 0 when Redis not ready', async () => {
      mockRedisService.isReady.mockReturnValue(false);

      const count = await service.getFailureCount('ip:192.168.1.1', 'login');

      expect(count).toBe(0);
    });
  });

  describe('recordLoginFailure', () => {
    it('should record failure by IP', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.incr.mockResolvedValue(1);

      await service.recordLoginFailure('192.168.1.1', undefined, 'tenant-123', 'req-123');

      expect(mockRedisService.incr).toHaveBeenCalledWith('auth:failure:login:ip:192.168.1.1');
    });

    it('should record failure by email if provided', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

      await service.recordLoginFailure('192.168.1.1', 'emailhash123', 'tenant-123', 'req-123');

      expect(mockRedisService.incr).toHaveBeenCalledWith('auth:failure:login:ip:192.168.1.1');
      expect(mockRedisService.incr).toHaveBeenCalledWith('auth:failure:login:email:emailhash123');
    });
  });
});
