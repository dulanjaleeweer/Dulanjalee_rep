import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { RedisService } from './redis/redis.service';

describe('AppModule', () => {
  let module: TestingModule;
  let configService: AppConfigService;
  let redisService: RedisService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService = module.get<AppConfigService>(AppConfigService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide AppConfigService', () => {
    expect(configService).toBeDefined();
    expect(typeof configService.port).toBe('number');
  });

  it('should provide RedisService', () => {
    expect(redisService).toBeDefined();
  });

  it('should have valid configuration values', () => {
    expect(configService.port).toBeGreaterThan(0);
    expect(typeof configService.nodeEnv).toBe('string');
    expect(typeof configService.redisHost).toBe('string');
    expect(typeof configService.redisPort).toBe('number');
  });
});
