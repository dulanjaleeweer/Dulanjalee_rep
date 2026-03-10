import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';

/**
 * Children module
 * Handles child profile operations
 */
@Module({
  imports: [RateLimitModule],
  controllers: [ChildrenController],
})
export class ChildrenModule {}
