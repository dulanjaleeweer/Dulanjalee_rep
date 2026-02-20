import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { METRIC_NAMES } from './metrics.interfaces';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    service.resetAll();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('increment', () => {
    it('should increment counter', () => {
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' });
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' });

      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' })).toBe(
        2,
      );
    });

    it('should handle different labels separately', () => {
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' });
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/signup' });

      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' })).toBe(
        1,
      );
      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/signup' })).toBe(
        1,
      );
    });

    it('should use custom increment value', () => {
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' }, 5);

      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' })).toBe(
        5,
      );
    });
  });

  describe('gauge', () => {
    it('should set gauge value', () => {
      service.gauge(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, 42, { route: '/test' });

      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/test' })).toBe(
        42,
      );
    });

    it('should overwrite previous gauge value', () => {
      service.gauge(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, 10, { route: '/test' });
      service.gauge(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, 20, { route: '/test' });

      expect(service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/test' })).toBe(
        20,
      );
    });
  });

  describe('histogram', () => {
    it('should record histogram values', () => {
      service.histogram(METRIC_NAMES.RATE_LIMIT_CHECK_DURATION, 15, { route: '/test' });
      service.histogram(METRIC_NAMES.RATE_LIMIT_CHECK_DURATION, 25, { route: '/test' });

      const count = service.getCounter(
        `${METRIC_NAMES.RATE_LIMIT_CHECK_DURATION}_count` as typeof METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL,
        { route: '/test' },
      );
      expect(count).toBe(2);
    });
  });

  describe('incrementRateLimitBlocked', () => {
    it('should increment rate limit blocked counter', () => {
      service.incrementRateLimitBlocked('/api/v1/auth/login', 'login');

      expect(
        service.getCounter(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, {
          route: '/api/v1/auth/login',
          type: 'login',
        }),
      ).toBe(1);
    });
  });

  describe('incrementAuthFailed', () => {
    it('should increment auth failed counter', () => {
      service.incrementAuthFailed('/api/v1/auth/login', 'login');

      expect(
        service.getCounter(METRIC_NAMES.AUTH_FAILED_TOTAL, {
          route: '/api/v1/auth/login',
          type: 'login',
        }),
      ).toBe(1);
    });
  });

  describe('incrementRedisUnavailable', () => {
    it('should increment Redis unavailable counter', () => {
      service.incrementRedisUnavailable('auth');

      expect(
        service.getCounter(METRIC_NAMES.REDIS_UNAVAILABLE_TOTAL, {
          endpointType: 'auth',
        }),
      ).toBe(1);
    });
  });

  describe('incrementAuthFailureThreshold', () => {
    it('should increment auth failure threshold counter', () => {
      service.incrementAuthFailureThreshold('/api/v1/auth/login', 'login');

      expect(
        service.getCounter(METRIC_NAMES.AUTH_FAILURE_THRESHOLD_REACHED, {
          route: '/api/v1/auth/login',
          type: 'login',
        }),
      ).toBe(1);
    });
  });

  describe('getAllCounters', () => {
    it('should return all counters', () => {
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' });
      service.increment(METRIC_NAMES.AUTH_FAILED_TOTAL, { route: '/login' });

      const allCounters = service.getAllCounters();

      expect(allCounters.size).toBe(2);
    });
  });

  describe('resetAll', () => {
    it('should reset all counters', () => {
      service.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, { route: '/login' });
      service.resetAll();

      expect(service.getAllCounters().size).toBe(0);
    });
  });
});
