import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed configuration service
 * Centralizes access to all environment configuration
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // Application
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get apiPrefix(): string {
    return this.configService.get<string>('API_PREFIX', 'api/v1');
  }

  get corsOrigins(): string | string[] {
    const origins = this.configService.get<string>('CORS_ORIGINS', '*');
    if (origins === '*') return '*';
    return origins.split(',').map((o) => o.trim());
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get redisPort(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  get redisPassword(): string {
    return this.configService.get<string>('REDIS_PASSWORD', '');
  }

  get redisDb(): number {
    return this.configService.get<number>('REDIS_DB', 0);
  }

  get redisTlsEnabled(): boolean {
    return this.configService.get<boolean>('REDIS_TLS_ENABLED', false);
  }

  get redisClusterEnabled(): boolean {
    return this.configService.get<boolean>('REDIS_CLUSTER_ENABLED', false);
  }

  get redisUrl(): string {
    const protocol = this.redisTlsEnabled ? 'rediss' : 'redis';
    const auth = this.redisPassword ? `:${this.redisPassword}@` : '';
    return `${protocol}://${auth}${this.redisHost}:${this.redisPort}/${this.redisDb}`;
  }

  // Database (PostgreSQL)
  get dbHost(): string {
    return this.configService.get<string>('DB_HOST', 'localhost');
  }

  get dbPort(): number {
    return this.configService.get<number>('DB_PORT', 5432);
  }

  get dbUsername(): string {
    return this.configService.get<string>('DB_USERNAME', 'postgres');
  }

  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD', '');
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME', 'abc_earlysteps');
  }

  get dbSsl(): boolean {
    const val = this.configService.get<string | boolean>('DB_SSL');
    if (val === undefined || val === null) return false;
    if (typeof val === 'boolean') return val;
    return String(val).toLowerCase() === 'true';
  }

  get dbPoolMax(): number {
    return this.configService.get<number>('DB_POOL_MAX', 20);
  }

  // Password Hashing
  get bcryptRounds(): number {
    return this.configService.get<number>('BCRYPT_ROUNDS', 12);
  }

  // Rate Limiting Configuration - Login
  get rateLimitLoginPerIp(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_PER_IP', 10);
  }

  get rateLimitLoginPerIpWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_PER_IP_WINDOW', 60);
  }

  get rateLimitLoginPerEmail(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_PER_EMAIL', 5);
  }

  get rateLimitLoginPerEmailWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_PER_EMAIL_WINDOW', 60);
  }

  get rateLimitLoginBurst(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_BURST', 30);
  }

  get rateLimitLoginBurstWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_LOGIN_BURST_WINDOW', 600);
  }

  // Rate Limiting Configuration - Password Reset
  get rateLimitPasswordResetPerIp(): number {
    return this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_PER_IP', 20);
  }

  get rateLimitPasswordResetPerIpWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_PER_IP_WINDOW', 900);
  }

  get rateLimitPasswordResetPerEmail(): number {
    return this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_PER_EMAIL', 5);
  }

  get rateLimitPasswordResetPerEmailWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_PASSWORD_RESET_PER_EMAIL_WINDOW', 900);
  }

  // Rate Limiting Configuration - Email Verification
  get rateLimitEmailVerifyResendPerIp(): number {
    return this.configService.get<number>('RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_IP', 10);
  }

  get rateLimitEmailVerifyResendPerIpWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_IP_WINDOW', 900);
  }

  get rateLimitEmailVerifyResendPerEmail(): number {
    return this.configService.get<number>('RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_EMAIL', 3);
  }

  get rateLimitEmailVerifyResendPerEmailWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_EMAIL_VERIFY_RESEND_PER_EMAIL_WINDOW', 900);
  }

  // Rate Limiting Configuration - Refresh Token
  get rateLimitRefreshTokenPerUser(): number {
    return this.configService.get<number>('RATE_LIMIT_REFRESH_TOKEN_PER_USER', 30);
  }

  get rateLimitRefreshTokenPerUserWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_REFRESH_TOKEN_PER_USER_WINDOW', 60);
  }

  // Rate Limiting Configuration - Public
  get rateLimitPublicPerIp(): number {
    return this.configService.get<number>('RATE_LIMIT_PUBLIC_PER_IP', 120);
  }

  get rateLimitPublicPerIpWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_PUBLIC_PER_IP_WINDOW', 60);
  }

  // Rate Limiting Configuration - Sensitive
  get rateLimitSensitivePerUser(): number {
    return this.configService.get<number>('RATE_LIMIT_SENSITIVE_PER_USER', 300);
  }

  get rateLimitSensitivePerUserWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_SENSITIVE_PER_USER_WINDOW', 60);
  }

  // Security Configuration
  get trustedProxyIps(): string[] {
    const ips = this.configService.get<string>('TRUSTED_PROXY_IPS', '');
    return ips ? ips.split(',').map((ip) => ip.trim()) : [];
  }

  get authFailureThreshold(): number {
    return this.configService.get<number>('AUTH_FAILURE_THRESHOLD', 5);
  }

  // Logging Configuration
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get logRedactFields(): string[] {
    const fields = this.configService.get<string>('LOG_REDACT_FIELDS', '');
    return fields ? fields.split(',').map((f) => f.trim()) : [];
  }
}
