import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';
import { AppConfigService } from '../config/config.service';
import { validateEnv } from '../config/env.validation';

describe('RedisService', () => {
  let service: RedisService;
  let configService: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validate: validateEnv,
          ignoreEnvFile: true,
        }),
      ],
      providers: [RedisService, AppConfigService],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get<AppConfigService>(AppConfigService);
  });

  afterEach(async () => {
    // Cleanup
    try {
      const client = service.getClient();
      if (client) {
        await client.quit();
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should provide access to config service', () => {
    expect(configService).toBeDefined();
    expect(configService.redisHost).toBeDefined();
  });

  describe('isReady', () => {
    it('should return false when not connected', () => {
      // Before connection is established
      expect(service.isReady()).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should provide Redis client instance', () => {
      const client = service.getClient();
      // Client may be undefined if connection failed
      // but the method should not throw
      expect(() => service.getClient()).not.toThrow();
    });
  });
});
