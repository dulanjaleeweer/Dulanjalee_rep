import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Global metrics module
 * Provides CloudWatch-compatible metrics counters
 */
@Global()
@Module({
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
