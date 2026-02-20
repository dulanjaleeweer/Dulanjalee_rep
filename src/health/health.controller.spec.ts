import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from '../redis/redis-health.indicator';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockRedisHealthIndicator = {
    isHealthy: jest.fn(),
  };

  const mockRedisService = {
    ping: jest.fn(),
    isReady: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        ConfigModule.forRoot({
          validate: validateEnv,
          ignoreEnvFile: true,
        }),
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealthIndicator,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        AppConfigService,
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check (liveness)', () => {
    it('should return health status', async () => {
      const expectedResult = {
        status: 'ok',
        info: { memory_heap: { status: 'up' } },
        error: {},
        details: { memory_heap: { status: 'up' } },
      };

      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('ready (readiness)', () => {
    it('should return readiness status', async () => {
      const expectedResult = {
        status: 'ok',
        info: { redis: { status: 'up' } },
        error: {},
        details: { redis: { status: 'up' } },
      };

      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.ready();

      expect(result.status).toBe('ok');
      expect(healthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('live (alternative liveness)', () => {
    it('should return liveness status', async () => {
      const expectedResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(expectedResult);

      const result = await controller.live();

      expect(result.status).toBe('ok');
    });
  });
});
