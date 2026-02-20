import { Params } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '../../config/config.service';

/**
 * Generate Pino logger configuration based on environment
 * Includes correlation ID support and PII redaction
 */
export function loggerFactory(config: AppConfigService): Params {
  const isDevelopment = config.isDevelopment;

  // Base redaction paths for sensitive data
  const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-api-key"]',
    'req.headers["x-auth-token"]',
    'password',
    'req.body.password',
    'req.body.newPassword',
    'req.body.currentPassword',
    'req.body.token',
    'req.body.refreshToken',
    'req.body.accessToken',
    'req.body.email',
    'response.token',
    'response.accessToken',
    'response.refreshToken',
    ...config.logRedactFields.map((field) => `req.body.${field}`),
    ...config.logRedactFields.map((field) => `response.${field}`),
  ];

  return {
    pinoHttp: {
      // Log level based on environment
      level: config.logLevel,

      // Pretty printing in development, JSON in production
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              levelFirst: false,
              messageFormat: '{req.id} - {msg}',
              ignore: 'pid,hostname,req.headers,res.headers',
            },
          }
        : undefined,

      // Redaction configuration - censor sensitive fields
      redact: {
        paths: redactPaths,
        remove: true, // Completely remove rather than censor with [Redacted]
      },

      // Custom serializers for request/response
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          // Don't log query params that might contain sensitive data
          path: req.url?.split('?')[0],
          headers: {
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-request-id': req.headers['x-request-id'],
            'x-correlation-id': req.headers['x-correlation-id'],
            'x-tenant-id': req.headers['x-tenant-id'],
          },
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },

      // Auto logging configuration
      autoLogging: {
        // Don't log health check endpoints to reduce noise
        ignore: (req) => {
          const url = req.url || '';
          return url.includes('/health') || url.includes('/ready');
        },
      },

      // Custom message format
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} completed with ${res.statusCode}`;
      },

      customErrorMessage: (req, res, error) => {
        return `${req.method} ${req.url} failed with ${res.statusCode}: ${error.message}`;
      },

      // GenReqId - use existing correlation ID or generate new one
      genReqId: (req, res) => {
        const existingId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || req.id;

        if (existingId) {
          return existingId as string;
        }

        // Generate new UUID if no ID present
        const id = uuidv4();
        res.setHeader('x-request-id', id);
        return id;
      },
    },
  };
}
