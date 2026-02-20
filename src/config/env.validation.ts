import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Environment variable validation schema
 * Ensures all required env vars are present and valid at startup
 */
export class EnvironmentVariables {
  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '*';

  // Redis Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string = '';

  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  REDIS_DB: number = 0;

  @IsBoolean()
  @IsOptional()
  REDIS_TLS_ENABLED: boolean = false;

  @IsBoolean()
  @IsOptional()
  REDIS_CLUSTER_ENABLED: boolean = false;

  // Rate Limiting - Login
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_PER_IP: number = 10;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_PER_IP_WINDOW: number = 60;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_PER_EMAIL: number = 5;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_PER_EMAIL_WINDOW: number = 60;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_BURST: number = 30;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_LOGIN_BURST_WINDOW: number = 600;

  // Rate Limiting - Password Reset
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PASSWORD_RESET_PER_IP: number = 20;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PASSWORD_RESET_PER_IP_WINDOW: number = 900;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PASSWORD_RESET_PER_EMAIL: number = 5;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PASSWORD_RESET_PER_EMAIL_WINDOW: number = 900;

  // Rate Limiting - Email Verification
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_IP: number = 10;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_IP_WINDOW: number = 900;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_EMAIL: number = 3;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_EMAIL_WINDOW: number = 900;

  // Rate Limiting - Refresh Token
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_REFRESH_TOKEN_PER_USER: number = 30;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_REFRESH_TOKEN_PER_USER_WINDOW: number = 60;

  // Rate Limiting - Public
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PUBLIC_PER_IP: number = 120;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_PUBLIC_PER_IP_WINDOW: number = 60;

  // Rate Limiting - Sensitive
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_SENSITIVE_PER_USER: number = 300;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_SENSITIVE_PER_USER_WINDOW: number = 60;

  // Security
  @IsString()
  @IsOptional()
  TRUSTED_PROXY_IPS: string = '';

  @IsNumber()
  @IsOptional()
  AUTH_FAILURE_THRESHOLD: number = 5;

  // Logging
  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsString()
  @IsOptional()
  LOG_REDACT_FIELDS: string = 'password,token,authorization,cookie,email,refreshToken,accessToken';
}

/**
 * Validate environment variables
 * Throws an error if validation fails, preventing the app from starting with invalid config
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map(
      (error) => `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`,
    );
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }

  return validatedConfig;
}
