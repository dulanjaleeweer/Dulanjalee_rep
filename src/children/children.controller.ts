import { Controller, Get, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Update child profile DTO
 */
class UpdateChildDto {
  name?: string;
  dateOfBirth?: string;
  notes?: string;
}

/**
 * Children controller
 * Handles child profile operations (sensitive endpoint)
 */
@Controller('children')
export class ChildrenController {
  /**
   * Get child profile by ID
   * Rate limited per user (sensitive)
   */
  @Get(':id')
  @RateLimit('sensitive')
  async getChild(@Param('id') id: string): Promise<{
    id: string;
    name: string;
    dateOfBirth: string;
    familyId: string;
    tenantId: string;
  }> {
    // Stub implementation
    // In production: fetch from database with authorization check

    return {
      id,
      name: 'Child Name',
      dateOfBirth: '2020-01-01',
      familyId: 'family-123',
      tenantId: 'tenant-456',
    };
  }

  /**
   * Update child profile
   * Rate limited per user (sensitive)
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimit('sensitive')
  async updateChild(
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
  ): Promise<{
    message: string;
    child: {
      id: string;
      name: string;
      dateOfBirth: string;
    };
  }> {
    // Stub implementation
    // In production: update in database with authorization check

    return {
      message: 'Child profile updated successfully.',
      child: {
        id,
        name: dto.name || 'Child Name',
        dateOfBirth: dto.dateOfBirth || '2020-01-01',
      },
    };
  }
}
