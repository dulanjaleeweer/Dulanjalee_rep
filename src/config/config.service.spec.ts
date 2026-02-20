import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { validateEnv } from './env.validation';

describe('AppConfigService', () => {
  let service: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validate: validateEnv,
          ignoreEnvFile: true,
          load: [() => ({
            NODE_ENV: 'test',
            PORT: '3001',
            REDIS_HOST: 'test-redis',
            REDIS_PORT: '6380',
            RATE_LIMIT_LOGIN_PER_IP: '5',
          })],
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct nodeEnv', () => {
    expect(service.nodeEnv).toBe('test');
    expect(service.isDevelopment).toBe(false);
    expect(service.isProduction).toBe(false);
  });

  it('should return correct port', () => {
    expect(service.port).toBe(3001);
  });

  it('should return correct Redis configuration', () => {
    expect(service.redisHost).toBe('test-redis');
    expect(service.redisPort).toBe(6380);
  });

  it('should return correct rate limiting configuration', () => {
    expect(service.rateLimitLoginPerIp).toBe(5);
  });

  it('should build correct Redis URL', () => {
    expect(service.redisUrl).toContain('test-redis');
    expect(service.redisUrl).toContain('6380');
  });
});
