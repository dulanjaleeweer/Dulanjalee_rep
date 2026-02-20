import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extended Request interface with correlationId property
 */
interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

/**
 * Middleware to ensure every request has a correlation/request ID
 * This ID is used for tracing requests through logs and across services
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
    // Check for existing correlation ID in headers
    const existingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];

    // Use existing ID or generate new one
    const correlationId = (existingId as string) || uuidv4();

    // Set the correlation ID on the request object for access in controllers/services
    req.correlationId = correlationId;

    // Add to response headers so client can use it for support/debugging
    if (!res.headersSent) {
      res.setHeader('x-correlation-id', correlationId);
      res.setHeader('x-request-id', correlationId);
    }

    next();
  }
}
