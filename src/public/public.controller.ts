import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

/**
 * Public controller
 * Handles public endpoints with baseline rate limiting
 */
@Controller('public')
export class PublicController {
  /**
   * Get public API status/health
   * Rate limited by IP (public baseline)
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @RateLimit('public')
  async getStatus(): Promise<{
    status: string;
    version: string;
    timestamp: string;
  }> {
    return {
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get public information about the application
   * Rate limited by IP (public baseline)
   */
  @Get('info')
  @HttpCode(HttpStatus.OK)
  @RateLimit('public')
  async getInfo(): Promise<{
    name: string;
    description: string;
    support: {
      email: string;
      phone: string;
    };
  }> {
    return {
      name: 'ABC EarlySteps',
      description: 'Mobile and web-based education support application for children with autism.',
      support: {
        email: 'support@abcearlysteps.com',
        phone: '1-800-ABC-HELP',
      },
    };
  }

  /**
   * Get public content list (activities, resources)
   * Rate limited by IP (public baseline)
   */
  @Get('content')
  @HttpCode(HttpStatus.OK)
  @RateLimit('public')
  async getContent(): Promise<{
    activities: Array<{
      id: string;
      name: string;
      category: string;
    }>;
  }> {
    return {
      activities: [
        {
          id: 'activity-1',
          name: 'Communication Basics',
          category: 'communication',
        },
        {
          id: 'activity-2',
          name: 'Social Skills Intro',
          category: 'social',
        },
        {
          id: 'activity-3',
          name: 'Motor Skills Play',
          category: 'motor',
        },
      ],
    };
  }
}
