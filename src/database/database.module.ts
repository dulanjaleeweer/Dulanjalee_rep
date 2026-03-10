import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserCredentials } from '../entities/user-credentials.entity';
import { UserRoleAssignment } from '../entities/user-role.entity';

const entities = [Tenant, User, UserCredentials, UserRoleAssignment];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres' as const,
        host: config.dbHost,
        port: config.dbPort,
        username: config.dbUsername,
        password: config.dbPassword,
        database: config.dbName,
        entities,
        synchronize: false,
        logging: config.isDevelopment,
        ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
        extra: {
          max: config.dbPoolMax,
          min: 2,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        },
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
