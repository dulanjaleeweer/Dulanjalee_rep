import { Module, Global } from '@nestjs/common';
import { SecurityAuditService } from './security-audit.service';

/**
 * Global security audit module
 * Provides structured security event logging throughout the application
 */
@Global()
@Module({
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
