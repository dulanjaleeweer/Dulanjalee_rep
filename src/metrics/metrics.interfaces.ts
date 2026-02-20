/**
 * Metrics interfaces for CloudWatch-compatible monitoring
 */

/**
 * Metric labels/dimensions for CloudWatch
 */
export interface MetricLabels {
  /** API route/path */
  route?: string;

  /** Rate limit type */
  type?: string;

  /** Endpoint category (auth, public, sensitive) */
  endpointType?: string;

  /** Tenant ID */
  tenantId?: string;

  /** HTTP status code */
  statusCode?: string;

  [key: string]: string | undefined;
}

/**
 * Counter metric value
 */
export interface CounterMetric {
  /** Metric name */
  name: string;

  /** Metric value */
  value: number;

  /** Timestamp */
  timestamp: number;

  /** Labels/dimensions */
  labels: MetricLabels;
}

/**
 * Metric definitions
 */
export const METRIC_NAMES = {
  /** Rate limit blocked counter */
  RATE_LIMIT_BLOCKED_TOTAL: 'rate_limit_blocked_total',

  /** Auth failed counter */
  AUTH_FAILED_TOTAL: 'auth_failed_total',

  /** Redis unavailable counter */
  REDIS_UNAVAILABLE_TOTAL: 'redis_unavailable_total',

  /** Rate limit check duration */
  RATE_LIMIT_CHECK_DURATION: 'rate_limit_check_duration_ms',

  /** Auth failure threshold reached */
  AUTH_FAILURE_THRESHOLD_REACHED: 'auth_failure_threshold_reached_total',
} as const;

/**
 * Metric type
 */
export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  /**
   * Increment a counter metric
   */
  increment(name: MetricName, labels?: MetricLabels, value?: number): void;

  /**
   * Record a gauge value
   */
  gauge(name: MetricName, value: number, labels?: MetricLabels): void;

  /**
   * Record a histogram value
   */
  histogram(name: MetricName, value: number, labels?: MetricLabels): void;
}
