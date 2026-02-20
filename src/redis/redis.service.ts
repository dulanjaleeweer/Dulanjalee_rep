import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { AppConfigService } from '../config/config.service';

/**
 * Redis service providing ElastiCache-compatible Redis client
 * Supports standalone, cluster, and TLS configurations
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isConnected = false;

  constructor(private readonly configService: AppConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Initialize Redis connection with configured options
   */
  private async connect(): Promise<void> {
    try {
      const options: RedisOptions = {
        host: this.configService.redisHost,
        port: this.configService.redisPort,
        db: this.configService.redisDb,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          this.logger.warn(`Redis reconnect attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        lazyConnect: true, // Don't connect immediately, wait for explicit connect
      };

      // Add password if configured
      if (this.configService.redisPassword) {
        options.password = this.configService.redisPassword;
      }

      // Add TLS if enabled (for ElastiCache in-transit encryption)
      if (this.configService.redisTlsEnabled) {
        options.tls = {
          rejectUnauthorized: false, // Allow self-signed certs for ElastiCache
        };
      }

      this.client = new Redis(options);

      // Set up event handlers
      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis client error: ${err.message}`, err.stack);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('Redis client connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis client reconnecting...');
      });

      // Explicitly connect
      await this.client.connect();
      
      this.logger.log(`Redis connected to ${this.configService.redisHost}:${this.configService.redisPort}`);
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
      // Don't throw - allow app to start and handle Redis unavailability gracefully
      this.isConnected = false;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is connected and ready
   */
  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Ping Redis to verify connectivity
   */
  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.ping();
  }

  /**
   * Execute a Lua script atomically on Redis
   * Used for atomic rate limiting operations
   */
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.eval(script, keys.length, ...keys, ...args);
  }

  /**
   * Increment a counter with optional expiry
   * Returns the new value
   */
  async incr(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.incr(key);
  }

  /**
   * Set expiry on a key
   */
  async expire(key: string, seconds: number): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.expire(key, seconds);
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.ttl(key);
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.get(key);
  }

  /**
   * Set value with optional expiry
   */
  async set(key: string, value: string | number, ttlSeconds?: number): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.exists(key);
  }
}
