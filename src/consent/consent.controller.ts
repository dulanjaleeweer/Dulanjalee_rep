import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Grant consent DTO
 */
class GrantConsentDto {
  childId!: string;
  caregiverId!: string;
  permissions!: string[];
}

/**
 * Revoke consent DTO
 */
class RevokeConsentDto {
  childId!: string;
  caregiverId!: string;
}

/**
 * Consent controller
 * Handles consent grant and revoke operations (sensitive endpoint)
 */
@Controller('consent')
export class ConsentController {
  /**
   * Grant consent for caregiver to access child data
   * Rate limited per user (sensitive)
   */
  @Post('grant')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit('sensitive')
  async grantConsent(@Body() dto: GrantConsentDto): Promise<{
    message: string;
    consent: {
      id: string;
      childId: string;
      caregiverId: string;
      permissions: string[];
      grantedAt: string;
    };
  }> {
    // Stub implementation
    // In production: create consent record, notify caregiver

    return {
      message: 'Consent granted successfully.',
      consent: {
        id: 'consent-123',
        childId: dto.childId,
        caregiverId: dto.caregiverId,
        permissions: dto.permissions,
        grantedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Revoke consent for caregiver
   * Rate limited per user (sensitive)
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @RateLimit('sensitive')
  async revokeConsent(@Body() dto: RevokeConsentDto): Promise<{
    message: string;
    consent: {
      id: string;
      childId: string;
      caregiverId: string;
      revokedAt: string;
    };
  }> {
    // Stub implementation
    // In production: update consent record, notify caregiver

    return {
      message: 'Consent revoked successfully.',
      consent: {
        id: 'consent-123',
        childId: dto.childId,
        caregiverId: dto.caregiverId,
        revokedAt: new Date().toISOString(),
      },
    };
  }
}
