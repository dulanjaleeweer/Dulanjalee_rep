import { DataSource } from 'typeorm';
import { config } from 'dotenv';

/**
 * Standalone TypeORM DataSource for CLI operations (migrations).
 *
 * Usage:
 *   npx typeorm-ts-node-commonjs migration:run    -d src/database/typeorm.config.ts
 *   npx typeorm-ts-node-commonjs migration:revert -d src/database/typeorm.config.ts
 */
config(); // load .env

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'abc_earlysteps',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  logging: process.env.NODE_ENV === 'development',
});
