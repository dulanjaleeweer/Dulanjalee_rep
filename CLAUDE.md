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
npm run migration:run # Run TypeORM migrations
npm run migration:revert # Revert last migration
```

## Module Structure

```
src/
├── app.module.ts          # Root module, wires all modules + correlation ID middleware
├── main.ts                # Bootstrap: Pino logger, global validation pipe, API prefix api/v1
├── auth/                  # Authentication (login, refresh, MFA stub, registration)
│   ├── dto/               # RegisterDto with class-validator decorators
│   └── services/          # RegistrationService, PasswordService, PasswordPolicyService
├── children/              # Child profile endpoints (stub, sensitive)
├── database/              # DatabaseModule (TypeORM), migrations, CLI config
├── common/
│   ├── logger/            # Pino logger factory with PII redaction
│   └── middleware/        # CorrelationIdMiddleware (UUID on all requests)
├── config/                # AppConfigModule (global), typed AppConfigService, env validation
├── entities/              # TypeORM entities: Tenant, User, UserCredentials, UserRoleAssignment
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
@RateLimit({ type: 'login', limit: 5, windowSeconds: 900 })  // Custom overrides
@SkipRateLimit()                 // Bypass
```
- Global guard registered via APP_GUARD
- Auth endpoints fail-safe (503 if Redis down); others fail-open
- Multi-strategy keys: IP, email-hash, user, tenant

### Registration (POST /v1/auth/register)
- **Anti-enumeration**: Always returns `201 { status: 'ok' }` whether email is new or exists
- **Timing-attack mitigation**: Password hashed even for duplicate emails
- **Transactional**: Tenant + User + UserCredentials + UserRoleAssignment in single DB transaction
- **Password policy**: 12-72 chars, 3-of-4 categories (lower, upper, digit, symbol), common password denylist (~200 entries)
- **Hashing**: bcrypt via bcryptjs, configurable cost factor (BCRYPT_ROUNDS, default 12)
- **Rate limiting**: 5 req/IP/15min, reuses 'login' type for fail-safe behavior

### Security Audit Events
```typescript
securityAuditService.logRegistrationAttempt({ outcome, emailHash, ipHash, requestId, ... })
securityAuditService.logRateLimitBlocked({ route, rateLimitType, limit, ... })
```
- All PII hashed (SHA-256, truncated to 16 chars) before logging
- Event types: SECURITY_REGISTRATION_ATTEMPT, SECURITY_RATE_LIMIT_BLOCKED, SECURITY_AUTH_FAILED_THRESHOLD_REACHED, SECURITY_REDIS_UNAVAILABLE
- Registration outcomes: `created`, `duplicate`, `validation_failed`, `error`

### Metrics (Registration)
- `registration_attempt_total` — every attempt (all outcomes)
- `registration_success_total` — new account created (labelled by role)
- `registration_duplicate_total` — existing email silently handled
- `registration_validation_failed_total` — password policy rejection
- `registration_error_total` — transaction/system failure

### PII Protection
- Pino auto-redacts: passwords, tokens, emails, auth headers, cookies
- Correlation IDs on all requests (x-correlation-id / x-request-id)
- Never log raw emails or child data; use SHA-256 hashes

### Configuration
- All settings via env vars (see `.env.example`)
- `AppConfigService` provides typed accessors (includes `bcryptRounds`, DB config, rate limits)
- `EnvironmentVariables` class validates with class-validator on startup

### Database
- TypeORM 0.3.x with PostgreSQL, async config from AppConfigService
- Entities: Tenant, User, UserCredentials, UserRoleAssignment
- Enums: TenantType (FAMILY/ORGANIZATION/INTERNAL), UserStatus (PENDING_VERIFICATION/ACTIVE/SUSPENDED), UserRole (5 roles)
- Migrations via CLI: `npm run migration:run`, `npm run migration:revert`
- Global email uniqueness via `emailNormalized` unique column

## Current Work: Story #59 - User Registration

Branch: `feature/59-user-registration-with-email-and-password-tenant-aware-secure-mobile-web`

### Implementation Status
- [x] Step 1: Merged foundational modules from feature/66 (Config, Logger, Redis, RateLimit, SecurityAudit, Metrics, Health)
- [x] Step 2: PostgreSQL persistence (TypeORM entities + migrations for tenants, users, credentials, roles)
- [x] Step 3: POST /v1/auth/register endpoint with password policy, anti-enumeration, rate limiting
- [x] Step 4: Security audit + observability hooks for registration
- [ ] Step 5: Frontend UIs (Next.js web + React Native mobile)

### Registration Design Decisions
- Global email uniqueness (not per-tenant)
- Always return 201 for anti-enumeration (even on duplicate email)
- bcrypt with cost 12+ for password hashing (bcryptjs, pure JS)
- New tenant per registration (FAMILY default, INTERNAL for admin roles)
- No auto-login after registration (feature flag, default off)
- Transactional: all-or-nothing record creation via QueryRunner
- Password policy: 12-72 chars, 3/4 categories (lower, upper, digit, symbol), common password denylist
- RegisterDto defaults role to FAMILY_OWNER; acceptTerms optional
