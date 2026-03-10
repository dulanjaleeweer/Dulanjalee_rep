import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { loggerFactory } from './common/logger/logger.config';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RedisModule } from './redis/redis.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { HealthModule } from './health/health.module';
import { SecurityAuditModule } from './security-audit/security-audit.module';
import { MetricsModule } from './metrics/metrics.module';
import { DatabaseModule } from './database/database.module';

// Controller modules
import { AuthModule } from './auth/auth.module';
import { PasswordModule } from './password/password.module';
import { EmailVerificationModule } from './email-verification/email-verification.module';
import { ProfileModule } from './profile/profile.module';
import { ChildrenModule } from './children/children.module';
import { ConsentModule } from './consent/consent.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    AppConfigModule,

    // Logger with request correlation IDs
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: loggerFactory,
    }),

    // Redis provider
    RedisModule,

    // Security audit (structured security events)
    SecurityAuditModule,

    // Metrics (CloudWatch-compatible counters)
    MetricsModule,

    // PostgreSQL + TypeORM
    DatabaseModule,

    // Rate limiting (auto-registers global guard)
    RateLimitModule,

    // Health endpoints
    HealthModule,

    // Controller modules with rate limiting
    AuthModule, // Login, refresh token, MFA
    PasswordModule, // Password reset
    EmailVerificationModule, // Email verification
    ProfileModule, // User profile (sensitive)
    ChildrenModule, // Child profiles (sensitive)
    ConsentModule, // Consent management (sensitive)
    PublicModule, // Public endpoints
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
