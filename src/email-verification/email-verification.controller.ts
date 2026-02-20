import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Email verification request DTO
 */
class VerifyEmailDto {
  token!: string;
}

/**
 * Resend verification email DTO
 */
class ResendVerificationDto {
  email!: string;
}

/**
 * Email verification controller
 * Handles email verification and resend requests
 */
@Controller('email-verification')
export class EmailVerificationController {
  /**
   * Verify email address using token
   * Rate limited by IP (token-based)
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit('emailVerifyToken')
  async verifyEmail(@Body() _dto: VerifyEmailDto): Promise<{
    message: string;
    verified: boolean;
  }> {
    // Stub implementation
    // In production: validate token, mark email as verified

    return {
      message: 'Email verified successfully.',
      verified: true,
    };
  }

  /**
   * Resend verification email
   * Rate limited by IP and email
   */
  @Post('resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('emailVerifyResend')
  async resendVerification(@Body() _dto: ResendVerificationDto): Promise<{
    message: string;
  }> {
    // Stub implementation
    // In production: generate new token, send email

    return {
      message: 'If an account exists with this email, a verification link has been sent.',
    };
  }
}
