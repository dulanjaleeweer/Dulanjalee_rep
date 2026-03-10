import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Password reset request DTO
 */
class PasswordResetRequestDto {
  email!: string;
}

/**
 * Password reset confirmation DTO
 */
class PasswordResetConfirmDto {
  token!: string;
  newPassword!: string;
}

/**
 * Password controller
 * Handles password reset request and confirmation
 */
@Controller('password')
export class PasswordController {
  /**
   * Request password reset
   * Sends reset link to user's email
   * Rate limited by IP and email
   */
  @Post('reset-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit('passwordReset')
  async requestReset(@Body() _dto: PasswordResetRequestDto): Promise<{
    message: string;
  }> {
    // Stub implementation
    // In production: generate reset token, send email

    return {
      message: 'If an account exists with this email, a reset link has been sent.',
    };
  }

  /**
   * Confirm password reset
   * Resets password using token from email
   * Rate limited by IP
   */
  @Post('reset-confirm')
  @HttpCode(HttpStatus.OK)
  @RateLimit('passwordResetConfirm')
  async confirmReset(@Body() _dto: PasswordResetConfirmDto): Promise<{
    message: string;
  }> {
    // Stub implementation
    // In production: validate token, update password

    return {
      message: 'Password has been reset successfully.',
    };
  }
}
