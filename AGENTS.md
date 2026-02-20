# ABC EarlySteps API - Agent Guide

## Project Overview

ABC EarlySteps is a mobile and web-based education support application for autistic children under five. This repository contains the NestJS backend API.

### Technology Stack
- **Framework**: NestJS 10.x with TypeScript
- **Database**: PostgreSQL (not yet integrated in current phase)
- **Cache/Rate Limiting**: Redis (ElastiCache-compatible via ioredis)
- **Logging**: Pino with correlation IDs and PII redaction
- **Testing**: Jest with ts-jest

## Architecture

### Module Structure
```
src/
├── config/           # Environment configuration with validation
├── common/           # Shared utilities (logger, middleware)
├── redis/            # Redis client provider and health indicator
├── health/           # Health/readiness endpoints
└── rate-limit/       # Rate limiting guard, service, and decorators
```

### Key Modules

#### Config Module (`src/config/`)
- **AppConfigModule**: Global configuration module using `@nestjs/config`
- **AppConfigService**: Typed access to all environment variables
- **EnvironmentVariables**: class-validator schema for env validation
- Rate limiting settings are fully externalized via env vars

#### Logger (`src/common/logger/`)
- Uses `nestjs-pino` for structured logging
- Automatic correlation/request ID generation
- PII redaction for: passwords, tokens, emails, authorization headers
- Request/response serialization with sensitive field removal

#### Redis (`src/redis/`)
- **RedisService**: ioredis client wrapper
  - Supports standalone, cluster, and TLS configurations
  - Lazy connection with retry logic
  - Atomic Lua script execution for rate limiting
- **RedisHealthIndicator**: Terminus health check for Redis connectivity

#### Health (`src/health/`)
- `GET /api/v1/health` - Liveness probe (memory, disk)
- `GET /api/v1/health/ready` - Readiness probe (includes Redis)
- `GET /api/v1/health/live` - Alternative liveness endpoint

#### Rate Limit (`src/rate-limit/`)
- **RateLimitModule**: Global module with auto-registered guard
- **RateLimitService**: Core service with Lua script atomic operations
- **RateLimitGuard**: Route guard supporting multiple key strategies
- **@RateLimit() decorator**: Per-route rate limit configuration
- **IP Utils**: X-Forwarded-For support, trusted proxies, IPv4/IPv6 normalization
- Key strategies: tenant, user, IP, emailHash (SHA-256), custom

Usage:
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @RateLimit('login')
  async login(@Body() dto: LoginDto) { ... }

  @Get('profile')
  @RateLimit({ type: 'sensitive', limit: 300, windowSeconds: 60 })
  async getProfile(@Req() req) { ... }
}
```

## Environment Configuration

Required environment variables (see `.env.example` for all options):

```bash
# Core
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS_ENABLED=false

# Rate Limiting (examples)
RATE_LIMIT_LOGIN_PER_IP=10
RATE_LIMIT_LOGIN_PER_IP_WINDOW=60
RATE_LIMIT_PUBLIC_PER_IP=120
```

## Development

### Setup
```bash
npm install
npm run build
npm run test
```

### Scripts
- `npm run start:dev` - Development with hot reload
- `npm run build` - Production build
- `npm run test` - Unit tests
- `npm run test:cov` - Tests with coverage
- `npm run lint` - ESLint with auto-fix
- `npm run format` - Prettier formatting

## Code Guidelines

### TypeScript
- Strict null checks enabled
- No implicit any
- Explicit return types on public APIs

### Linting
- ESLint with @typescript-eslint/recommended
- Prettier for formatting
- Pre-commit hooks (enforced via CI)

### Testing
- Unit tests for services and controllers
- Minimum 70% coverage for business logic
- Mock external dependencies (Redis, etc.)

## Security & Privacy

### PII Handling
- Never log raw emails, tokens, or child data
- Hash emails using SHA-256 when used in keys
- Redact sensitive fields from logs automatically

### Rate Limiting Keys
- Login: `rl:auth:login:tenant:{tenantId}:ip:{ip}` and `...:emailHash:{hash}`
- Password Reset: `rl:auth:pwreset:req:tenant:{tenantId}:ip:{ip}`
- Sensitive APIs: `rl:api:sensitive:tenant:{tenantId}:user:{userId}`
- Public: `rl:api:public:ip:{ip}`

## Story #66: Rate Limiting Implementation

Current Status: **Step 2 Complete** - Rate limiting module implemented

### Implemented (Step 1)
- [x] NestJS scaffold with TypeScript
- [x] Global config module with env validation
- [x] Structured logging (Pino) with correlation IDs and redaction
- [x] Redis client provider (ioredis, ElastiCache-compatible)
- [x] Health endpoints with Redis connectivity check
- [x] Unit tests for config, Redis, and health components

### Implemented (Step 2)
- [x] Rate limiting guard/interceptor with decorator
- [x] Fixed-window counter implementation with Lua script (atomic INCR+EXPIRE)
- [x] Multi-key strategies (IP, email hash SHA-256, user, tenant)
- [x] 429 response with Retry-After header and standard error body
- [x] Per-route configuration overrides via @RateLimit() options
- [x] IP extraction with X-Forwarded-For and trusted proxy support
- [x] IPv4/IPv6 normalization and CIDR matching
- [x] Unit tests for rate limit service, guard, and utilities (88 tests total)

### Pending (Step 3)
- [ ] Fail-open vs fail-safe modes
- [ ] Security event emission (SECURITY_RATE_LIMIT_BLOCKED)
- [ ] Metrics counters for CloudWatch

### Pending (Step 4)
- [ ] Apply rate limits to auth endpoints (login, refresh, etc.)
- [ ] Apply rate limits to sensitive endpoints (profile, children, consent)
- [ ] Public API baseline limits

### Pending (Step 5)
- [ ] Abuse detection hooks
- [ ] Auth failure threshold events
- [ ] Audit event integration

## CI/CD Notes

The project is configured for GitHub Actions with:
- Lint checking
- Unit test execution
- Security scanning
- Docker image builds

## Contact & Resources

- Project: ABC EarlySteps
- Story: #66 - Rate Limiting and Abuse Protection
- Stack: NestJS, TypeScript, Redis, PostgreSQL (future)
