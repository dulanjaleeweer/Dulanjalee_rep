import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('RateLimitService', () => {
  let service: RateLimitService;

  const mockRedisService = {
    isReady: jest.fn(),
    eval: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
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
        RateLimitService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        AppConfigService,
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkLimit', () => {
    it('should allow request when under limit', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.eval.mockResolvedValue([5, 60]); // count=5, ttl=60

      const result = await service.checkLimit('test-key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.remaining).toBe(5);
      expect(result.retryAfter).toBe(0);
    });

    it('should deny request when over limit', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.eval.mockResolvedValue([15, 45]); // count=15, ttl=45

      const result = await service.checkLimit('test-key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(15);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(45);
    });

    it('should throw error when Redis is not ready', async () => {
      mockRedisService.isReady.mockReturnValue(false);

      await expect(service.checkLimit('test-key', 10, 60)).rejects.toThrow('Redis not connected');
    });

    it('should throw error when Redis eval fails', async () => {
      mockRedisService.isReady.mockReturnValue(true);
      mockRedisService.eval.mockRejectedValue(new Error('Redis error'));

      await expect(service.checkLimit('test-key', 10, 60)).rejects.toThrow('Redis error');
    });
  });

  describe('getConfigForType', () => {
    it('should return config for login type', () => {
      const config = service.getConfigForType('login');

      expect(config.limit).toBeDefined();
      expect(config.windowSeconds).toBeDefined();
      expect(typeof config.limit).toBe('number');
      expect(typeof config.windowSeconds).toBe('number');
    });

    it('should return config for public type', () => {
      const config = service.getConfigForType('public');

      expect(config.limit).toBeDefined();
      expect(config.windowSeconds).toBeDefined();
    });

    it('should return config for sensitive type', () => {
      const config = service.getConfigForType('sensitive');

      expect(config.limit).toBeDefined();
      expect(config.windowSeconds).toBeDefined();
    });

    it('should return default config for custom type', () => {
      const config = service.getConfigForType('custom');

      expect(config.limit).toBeDefined();
      expect(config.windowSeconds).toBeDefined();
    });
  });

  describe('resetLimit', () => {
    it('should delete key from Redis', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await service.resetLimit('test-key');

      expect(mockRedisService.del).toHaveBeenCalledWith('test-key');
    });

    it('should throw error when Redis fails', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.resetLimit('test-key')).rejects.toThrow('Redis error');
    });
  });

  describe('getCurrentCount', () => {
    it('should return count from Redis', async () => {
      mockRedisService.get.mockResolvedValue('5');

      const count = await service.getCurrentCount('test-key');

      expect(count).toBe(5);
    });

    it('should return 0 when key does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const count = await service.getCurrentCount('test-key');

      expect(count).toBe(0);
    });

    it('should return 0 when Redis fails', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));

      const count = await service.getCurrentCount('test-key');

      expect(count).toBe(0);
    });
  });

  describe('isRedisAvailable', () => {
    it('should return true when Redis is ready', () => {
      mockRedisService.isReady.mockReturnValue(true);

      expect(service.isRedisAvailable()).toBe(true);
    });

    it('should return false when Redis is not ready', () => {
      mockRedisService.isReady.mockReturnValue(false);

      expect(service.isRedisAvailable()).toBe(false);
    });
  });
});
