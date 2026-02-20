import { Controller, Get, Put, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Update profile DTO
 */
class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * User profile controller
 * Handles user profile operations (sensitive endpoint)
 */
@Controller('profile')
export class ProfileController {
  /**
   * Get current user profile
   * Rate limited per user (sensitive)
   */
  @Get()
  @RateLimit('sensitive')
  async getProfile(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
  }> {
    // Stub implementation
    // In production: fetch from database using authenticated user

    return {
      id: 'user-123',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      tenantId: 'tenant-456',
    };
  }

  /**
   * Update user profile
   * Rate limited per user (sensitive)
   */
  @Put()
  @HttpCode(HttpStatus.OK)
  @RateLimit('sensitive')
  async updateProfile(@Body() dto: UpdateProfileDto): Promise<{
    message: string;
    profile: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }> {
    // Stub implementation
    // In production: update in database

    return {
      message: 'Profile updated successfully.',
      profile: {
        id: 'user-123',
        email: 'user@example.com',
        firstName: dto.firstName || 'Jane',
        lastName: dto.lastName || 'Doe',
      },
    };
  }
}
