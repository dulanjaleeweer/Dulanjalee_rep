import { Injectable, Logger } from '@nestjs/common';
import {
  IMetricsCollector,
  MetricLabels,
  MetricName,
  METRIC_NAMES,
  CounterMetric,
} from './metrics.interfaces';

/**
 * Metrics service for CloudWatch-compatible monitoring
 * Maintains counters that can be scraped or pushed to CloudWatch
 *
 * Note: This is a simplified implementation. In production, you would:
 * - Use a proper metrics library like prom-client
 * - Push to CloudWatch via cloudwatch-embedded-metric-format
 * - Or expose a /metrics endpoint for Prometheus scraping
 */
@Injectable()
export class MetricsService implements IMetricsCollector {
  private readonly logger = new Logger(MetricsService.name);

  /** In-memory counter storage */
  private counters: Map<string, number> = new Map();

  /** Metric history for debugging */
  private recentMetrics: CounterMetric[] = [];

  /** Maximum history size */
  private readonly maxHistorySize = 1000;

  /**
   * Create a unique key for a metric with labels
   */
  private createKey(name: string, labels: MetricLabels): string {
    const labelStr = Object.entries(labels)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Increment a counter metric
   */
  increment(name: MetricName, labels: MetricLabels = {}, value: number = 1): void {
    const key = this.createKey(name, labels);
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + value;
    this.counters.set(key, newValue);

    // Store in history
    const metric: CounterMetric = {
      name,
      value: newValue,
      timestamp: Date.now(),
      labels,
    };

    this.recentMetrics.push(metric);

    // Trim history if needed
    if (this.recentMetrics.length > this.maxHistorySize) {
      this.recentMetrics = this.recentMetrics.slice(-this.maxHistorySize);
    }

    // Log at debug level
    this.logger.debug(`Metric increment: ${name} = ${newValue}`, labels);
  }

  /**
   * Record a gauge value (overwrites previous)
   */
  gauge(name: MetricName, value: number, labels: MetricLabels = {}): void {
    const key = this.createKey(name, labels);
    this.counters.set(key, value);

    this.logger.debug(`Metric gauge: ${name} = ${value}`, labels);
  }

  /**
   * Record a histogram value
   * For simplicity, we just count occurrences in buckets
   */
  histogram(name: MetricName, value: number, labels: MetricLabels = {}): void {
    // Create a histogram bucket label
    const bucketLabels = { ...labels, le: this.getBucketLabel(value) };
    this.increment(`${name}_bucket` as MetricName, bucketLabels);

    // Also increment +Inf bucket
    const infLabels = { ...labels, le: '+Inf' };
    this.increment(`${name}_bucket` as MetricName, infLabels);

    // Track sum and count
    const sumKey = this.createKey(`${name}_sum`, labels);
    const currentSum = this.counters.get(sumKey) || 0;
    this.counters.set(sumKey, currentSum + value);

    const countKey = this.createKey(`${name}_count`, labels);
    const currentCount = this.counters.get(countKey) || 0;
    this.counters.set(countKey, currentCount + 1);
  }

  /**
   * Get bucket label for histogram
   */
  private getBucketLabel(value: number): string {
    const buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    for (const bucket of buckets) {
      if (value <= bucket) {
        return bucket.toString();
      }
    }
    return '+Inf';
  }

  /**
   * Get current counter value
   */
  getCounter(name: MetricName, labels: MetricLabels = {}): number {
    const key = this.createKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Get all counters as a map
   */
  getAllCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  /**
   * Get recent metrics history
   */
  getRecentMetrics(limit: number = 100): CounterMetric[] {
    return this.recentMetrics.slice(-limit);
  }

  /**
   * Reset all counters (useful for testing)
   */
  resetAll(): void {
    this.counters.clear();
    this.recentMetrics = [];
    this.logger.log('All metrics counters reset');
  }

  /**
   * Increment rate limit blocked counter
   */
  incrementRateLimitBlocked(route: string, type: string): void {
    this.increment(METRIC_NAMES.RATE_LIMIT_BLOCKED_TOTAL, {
      route,
      type,
    });
  }

  /**
   * Increment auth failed counter
   */
  incrementAuthFailed(route: string, authType?: string): void {
    this.increment(METRIC_NAMES.AUTH_FAILED_TOTAL, {
      route,
      type: authType || 'unknown',
    });
  }

  /**
   * Increment Redis unavailable counter
   */
  incrementRedisUnavailable(endpointType: string): void {
    this.increment(METRIC_NAMES.REDIS_UNAVAILABLE_TOTAL, {
      endpointType,
    });
  }

  /**
   * Increment auth failure threshold reached counter
   */
  incrementAuthFailureThreshold(route: string, authType?: string): void {
    this.increment(METRIC_NAMES.AUTH_FAILURE_THRESHOLD_REACHED, {
      route,
      type: authType || 'unknown',
    });
  }

  /**
   * Record rate limit check duration
   */
  recordRateLimitCheckDuration(durationMs: number, route: string): void {
    this.histogram(METRIC_NAMES.RATE_LIMIT_CHECK_DURATION, durationMs, {
      route,
    });
  }
}
