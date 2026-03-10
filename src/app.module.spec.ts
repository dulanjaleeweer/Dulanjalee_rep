import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config/config.service';
import { AppConfigModule } from './config/config.module';
import { validateEnv } from './config/env.validation';

/**
 * AppModule spec — verifies core module configuration.
 *
 * We test the config subsystem directly rather than importing
 * the full AppModule, which would require live Redis and PostgreSQL
 * connections. Infrastructure integration is verified in E2E tests.
 */
describe('AppModule', () => {
  let module: TestingModule;
  let configService: AppConfigService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
          ignoreEnvFile: true,
        }),
        AppConfigModule,
      ],
    }).compile();

    configService = module.get<AppConfigService>(AppConfigService);
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

  it('should have valid application config', () => {
    expect(configService.port).toBeGreaterThan(0);
    expect(typeof configService.nodeEnv).toBe('string');
    expect(typeof configService.apiPrefix).toBe('string');
  });

  it('should have valid Redis config', () => {
    expect(typeof configService.redisHost).toBe('string');
    expect(typeof configService.redisPort).toBe('number');
  });

  it('should have valid database config', () => {
    expect(typeof configService.dbHost).toBe('string');
    expect(typeof configService.dbPort).toBe('number');
    expect(typeof configService.dbName).toBe('string');
    expect(typeof configService.dbPoolMax).toBe('number');
  });
});
