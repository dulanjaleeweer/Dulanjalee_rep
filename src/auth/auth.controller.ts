import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { AuthFailureTrackerService } from '../rate-limit/auth-failure-tracker.service';
import { extractClientIp, hashEmail, extractTenantId } from '../rate-limit/rate-limit.utils';
import { AppConfigService } from '../config/config.service';
import { RegisterDto } from './dto/register.dto';
import { RegistrationService } from './services/registration.service';

/**
 * Login request DTO
 */
class LoginDto {
  email!: string;
  password!: string;
}

/**
 * Refresh token request DTO
 */
class RefreshTokenDto {
  refreshToken!: string;
}

/**
 * MFA challenge request DTO
 */
class MfaChallengeDto {
  email!: string;
  code!: string;
}

/**
 * Authentication controller
 * Provides login, refresh token, and MFA challenge endpoints
 * Integrates with AuthFailureTracker for abuse detection
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authFailureTracker: AuthFailureTrackerService,
    private readonly configService: AppConfigService,
    private readonly registrationService: RegistrationService,
  ) {}

  /**
   * Registration endpoint
   * Always returns 201 { status: 'ok' } for anti-enumeration.
   * Rate limited: 5 requests per IP per 15 minutes, fail-safe (503 if Redis down).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ type: 'login', limit: 5, windowSeconds: 900 })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<{ status: string }> {
    const ip = extractClientIp(req, {
      trustedProxies: this.configService.trustedProxyIps,
      trustProxy: this.configService.trustedProxyIps.length > 0,
    });
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';
    const ipHash = hashEmail(ip) ?? 'unknown';

    return this.registrationService.register(dto, ipHash, requestId);
  }

  /**
   * Login endpoint
   * Rate limited by IP and email address
   * Tracks failed attempts for abuse detection
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    // Extract request context for tracking
    const ip = extractClientIp(req, {
      trustedProxies: this.configService.trustedProxyIps,
      trustProxy: this.configService.trustedProxyIps.length > 0,
    });
    const tenantId = extractTenantId(req);
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';
    const emailHash = hashEmail(dto.email);

    // Stub implementation - simulate authentication
    // In production: validate credentials against database
    const isValidCredentials = this.stubValidateCredentials(dto.email, dto.password);

    if (!isValidCredentials) {
      // Record failed login attempt for abuse detection
      // This will emit SECURITY_AUTH_FAILED_THRESHOLD_REACHED if threshold exceeded
      await this.authFailureTracker.recordLoginFailure(ip, emailHash, tenantId, requestId);

      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful authentication - reset failure counts
    // This clears the failure tracking for this IP/email
    if (emailHash) {
      await this.authFailureTracker.resetFailures(`email:${emailHash}`, 'login');
    }
    await this.authFailureTracker.resetFailures(`ip:${ip}`, 'login');

    return {
      message: 'Login successful',
      accessToken: 'stub-access-token',
      refreshToken: 'stub-refresh-token',
    };
  }

  /**
   * Refresh token endpoint
   * Rate limited per user
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit('refreshToken')
  async refreshToken(@Body() _dto: RefreshTokenDto): Promise<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    // Stub implementation
    // In production: validate refresh token, issue new tokens

    return {
      message: 'Refresh token endpoint - stub implementation',
      accessToken: 'stub-new-access-token',
      refreshToken: 'stub-new-refresh-token',
    };
  }

  /**
   * MFA challenge verification endpoint
   * Rate limited by IP and email
   * This is a placeholder for future MFA implementation
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit('login')
  async verifyMfa(@Body() _dto: MfaChallengeDto): Promise<{
    message: string;
    verified: boolean;
  }> {
    // Stub implementation
    // In production: verify MFA code, complete authentication

    return {
      message: 'MFA verification endpoint - stub implementation',
      verified: true,
    };
  }

  /**
   * Stub credential validation
   * In production, this would check against the database
   * For demo: only "test@example.com / password" succeeds
   */
  private stubValidateCredentials(email: string, password: string): boolean {
    // Demo credentials for testing
    return email === 'test@example.com' && password === 'password';
  }
}
