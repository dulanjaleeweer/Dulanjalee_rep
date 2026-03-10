# CLAUDE.md - ABC EarlySteps Backend

## Project Overview

ABC EarlySteps is a multi-tenant SaaS platform for early childhood autism support. This is the NestJS backend API.

**Stack**: NestJS 10.x, TypeScript (strict), PostgreSQL, Redis, Pino logging, Jest

## Quick Commands

```bash
npm run start:dev     # Dev server with hot reload
npm run build         # Production build
npm run test          # Unit tests (Jest)
npm run test:cov      # Tests with coverage
npm run lint          # ESLint with auto-fix
npm run format        # Prettier formatting
```

## Module Structure

```
src/
├── app.module.ts          # Root module, wires all modules + correlation ID middleware
├── main.ts                # Bootstrap: Pino logger, global validation pipe, API prefix api/v1
├── auth/                  # Authentication (login, refresh, MFA stub, registration)
├── children/              # Child profile endpoints (stub, sensitive)
├── common/
│   ├── logger/            # Pino logger factory with PII redaction
│   └── middleware/        # CorrelationIdMiddleware (UUID on all requests)
├── config/                # AppConfigModule (global), typed AppConfigService, env validation
├── consent/               # Consent management (stub, sensitive)
├── email-verification/    # Email verification (stub)
├── health/                # GET /api/v1/health, /health/ready, /health/live
├── metrics/               # MetricsService: CloudWatch-compatible counters/histograms
├── password/              # Password reset (stub)
├── profile/               # User profile (stub, sensitive)
├── public/                # Public endpoints with baseline rate limiting
├── rate-limit/            # Global RateLimitGuard, RateLimitService (Lua), decorators
├── redis/                 # RedisService (ioredis), RedisHealthIndicator
└── security-audit/        # SecurityAuditService: structured events, PII hashing
```

## Code Standards

- **TypeScript strict mode**: strictNullChecks, noImplicitAny
- **ESLint**: @typescript-eslint/recommended + prettier
- **Prettier**: single quotes, trailing commas, 2-space indent, 100 char width
- **Testing**: Jest, mock external deps (Redis, DB), target 70%+ coverage on business logic
- **Path aliases**: `@/*`, `@config/*`, `@common/*`, `@redis/*`, `@health/*`

## Key Patterns

### Rate Limiting
```typescript
@RateLimit('login')              // Simple: uses defaults from config
@RateLimit({ type: 'sensitive', limit: 300, windowSeconds: 60 })  // Custom
@SkipRateLimit()                 // Bypass
```
- Global guard registered via APP_GUARD
- Auth endpoints fail-safe (503 if Redis down); others fail-open
- Multi-strategy keys: IP, email-hash, user, tenant

### Security Audit Events
```typescript
securityAuditService.logEvent({ eventType, route, ipHash, requestId, ... })
```
- All PII hashed (SHA-256) before logging
- Event types: SECURITY_RATE_LIMIT_BLOCKED, SECURITY_AUTH_FAILED_THRESHOLD_REACHED, SECURITY_REDIS_UNAVAILABLE

### PII Protection
- Pino auto-redacts: passwords, tokens, emails, auth headers, cookies
- Correlation IDs on all requests (x-correlation-id / x-request-id)
- Never log raw emails or child data; use SHA-256 hashes

### Configuration
- All settings via env vars (see `.env.example`)
- `AppConfigService` provides typed accessors
- `EnvironmentVariables` class validates with class-validator on startup

## Current Work: Story #59 - User Registration

Branch: `feature/59-user-registration-with-email-and-password-tenant-aware-secure-mobile-web`

### Implementation Status
- [x] Step 1: Merged foundational modules from feature/66 (Config, Logger, Redis, RateLimit, SecurityAudit, Metrics, Health)
- [ ] Step 2: PostgreSQL persistence (TypeORM entities + migrations for tenants, users, credentials, roles)
- [ ] Step 3: POST /v1/auth/register endpoint with password policy, anti-enumeration, rate limiting
- [ ] Step 4: Security audit + observability for registration
- [ ] Step 5: Frontend UIs (Next.js web + React Native mobile)

### Registration Design Decisions
- Global email uniqueness (not per-tenant)
- Always return 201 for anti-enumeration (even on duplicate email)
- bcrypt with cost 12+ for password hashing
- New tenant per registration (FAMILY default, INTERNAL for admin roles)
- No auto-login after registration (feature flag, default off)
- Transactional: all-or-nothing record creation
- Password policy: 12-72 chars, 3/4 categories (lower, upper, digit, symbol), common password denylist
