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
          cache: false,
        }),
      ],
      providers: [AppConfigService],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return nodeEnv', () => {
    const env = service.nodeEnv;
    expect(typeof env).toBe('string');
    expect(['development', 'production', 'test']).toContain(env);
  });

  it('should return correct booleans based on nodeEnv', () => {
    const isDev = service.isDevelopment;
    const isProd = service.isProduction;
    expect(typeof isDev).toBe('boolean');
    expect(typeof isProd).toBe('boolean');
    // They should be mutually exclusive
    expect(isDev && isProd).toBe(false);
  });

  it('should return port as number', () => {
    const port = service.port;
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('should return Redis configuration', () => {
    expect(typeof service.redisHost).toBe('string');
    expect(typeof service.redisPort).toBe('number');
    expect(typeof service.redisDb).toBe('number');
    expect(typeof service.redisTlsEnabled).toBe('boolean');
    expect(typeof service.redisClusterEnabled).toBe('boolean');
  });

  it('should return rate limiting configuration as numbers', () => {
    expect(typeof service.rateLimitLoginPerIp).toBe('number');
    expect(typeof service.rateLimitLoginPerIpWindow).toBe('number');
    expect(typeof service.rateLimitPublicPerIp).toBe('number');
    expect(typeof service.rateLimitSensitivePerUser).toBe('number');
  });

  it('should build Redis URL', () => {
    const url = service.redisUrl;
    expect(typeof url).toBe('string');
    expect(url.startsWith('redis://') || url.startsWith('rediss://')).toBe(true);
  });

  it('should return security configuration', () => {
    expect(Array.isArray(service.trustedProxyIps)).toBe(true);
    expect(typeof service.authFailureThreshold).toBe('number');
  });

  it('should return logging configuration', () => {
    expect(typeof service.logLevel).toBe('string');
    expect(Array.isArray(service.logRedactFields)).toBe(true);
  });

  it('should return database configuration with defaults', () => {
    expect(service.dbHost).toBe('localhost');
    expect(service.dbPort).toBe(5432);
    expect(service.dbUsername).toBe('postgres');
    expect(service.dbPassword).toBe('');
    expect(service.dbName).toBe('abc_earlysteps');

    // ConfigService may coerce 'false' (string default) via internal processing;
    // the getter normalises to a strict boolean using string comparison.
    expect(typeof service.dbSsl).toBe('boolean');

    expect(service.dbPoolMax).toBe(20);
  });
});
