import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RegisterDto } from '../dto/register.dto';
import { PasswordService } from './password.service';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityAuditService } from '../../security-audit/security-audit.service';
import { MetricsService } from '../../metrics/metrics.service';
import { Tenant } from '../../entities/tenant.entity';
import { User } from '../../entities/user.entity';
import { UserCredentials } from '../../entities/user-credentials.entity';
import { UserRoleAssignment } from '../../entities/user-role.entity';
import { TenantType, UserStatus, UserRole } from '../../entities/enums';
import { RegistrationOutcome } from '../../security-audit/security-audit.interfaces';

/** Route constant for audit events */
const REGISTER_ROUTE = '/api/v1/auth/register';

/**
 * Orchestrates user registration with transactional integrity.
 *
 * Every outcome emits:
 * - A structured security audit event (PII-safe, hashed email/IP)
 * - Metric counter increments for observability dashboards
 *
 * Flow:
 * 1. Validate password against policy (reject early with 400)
 * 2. Normalize email
 * 3. Check for existing account (silent — anti-enumeration)
 * 4. Create tenant + user + credentials + role in a single transaction
 * 5. Always return { status: 'ok' } regardless of outcome
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly securityAuditService: SecurityAuditService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Register a new user account.
   *
   * @returns Always `{ status: 'ok' }` for anti-enumeration.
   * @throws BadRequestException if password fails policy validation.
   * @throws InternalServerErrorException on transaction failure.
   */
  async register(dto: RegisterDto, ipHash: string, requestId: string): Promise<{ status: string }> {
    const emailHash = this.securityAuditService.hashEmail(dto.email);

    // 1. Validate password against policy (before any DB work)
    const policyResult = this.passwordPolicyService.validate(dto.password);
    if (!policyResult.valid) {
      this.emitAuditAndMetrics('validation_failed', {
        ipHash,
        emailHash,
        requestId,
        role: dto.role,
        validationErrors: policyResult.errors,
      });
      throw new BadRequestException(policyResult.errors);
    }

    // 2. Normalize email
    const emailNormalized = dto.email.trim().toLowerCase();

    // 3. Check if email already exists (anti-enumeration: silent return)
    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: { emailNormalized },
      select: ['id'],
    });

    if (existingUser) {
      // Hash the password anyway to prevent timing-based enumeration
      await this.passwordService.hash(dto.password);
      this.emitAuditAndMetrics('duplicate', {
        ipHash,
        emailHash,
        requestId,
        role: dto.role,
      });
      return { status: 'ok' };
    }

    // 4. Create all records in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tenantType = this.resolveTenantType(dto.role);
      const tenantName = this.resolveTenantName(dto.displayName, tenantType);

      // Create tenant
      const tenant = queryRunner.manager.create(Tenant, {
        type: tenantType,
        name: tenantName,
      });
      const savedTenant = await queryRunner.manager.save(Tenant, tenant);

      // Create user
      const user = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        email: dto.email.trim(),
        emailNormalized,
        displayName: dto.displayName.trim(),
        status: UserStatus.PENDING_VERIFICATION,
        acceptTermsAt: dto.acceptTerms ? new Date() : null,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // Hash password and create credentials
      const passwordHash = await this.passwordService.hash(dto.password);
      const credentials = queryRunner.manager.create(UserCredentials, {
        userId: savedUser.id,
        passwordHash,
        passwordAlgo: this.passwordService.algorithm,
      });
      await queryRunner.manager.save(UserCredentials, credentials);

      // Assign role
      const roleAssignment = queryRunner.manager.create(UserRoleAssignment, {
        userId: savedUser.id,
        tenantId: savedTenant.id,
        role: dto.role,
      });
      await queryRunner.manager.save(UserRoleAssignment, roleAssignment);

      await queryRunner.commitTransaction();

      this.emitAuditAndMetrics('created', {
        ipHash,
        emailHash,
        requestId,
        role: dto.role,
        tenantType,
        userId: savedUser.id,
        tenantId: savedTenant.id,
      });

      return { status: 'ok' };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error('Registration transaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });

      this.emitAuditAndMetrics('error', {
        ipHash,
        emailHash,
        requestId,
        role: dto.role,
      });

      throw new InternalServerErrorException('Registration failed');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Emit a security audit event and increment metrics for the given outcome.
   * Centralises all observability in one place to keep the main flow readable.
   */
  private emitAuditAndMetrics(
    outcome: RegistrationOutcome,
    context: {
      ipHash: string;
      emailHash: string;
      requestId: string;
      role?: string;
      tenantType?: string;
      userId?: string;
      tenantId?: string;
      validationErrors?: string[];
    },
  ): void {
    // Always increment the attempt counter
    this.metricsService.incrementRegistrationAttempt();

    // Increment outcome-specific counter
    switch (outcome) {
      case 'created':
        this.metricsService.incrementRegistrationSuccess(context.role ?? 'unknown');
        break;
      case 'duplicate':
        this.metricsService.incrementRegistrationDuplicate();
        break;
      case 'validation_failed':
        this.metricsService.incrementRegistrationValidationFailed();
        break;
      case 'error':
        this.metricsService.incrementRegistrationError();
        break;
    }

    // Emit structured audit event (all PII hashed)
    this.securityAuditService.logRegistrationAttempt({
      route: REGISTER_ROUTE,
      ipHash: context.ipHash,
      emailHash: context.emailHash,
      keyType: 'email-hash',
      requestId: context.requestId,
      outcome,
      role: context.role,
      tenantType: context.tenantType,
      userId: context.userId,
      tenantId: context.tenantId,
      validationErrors: context.validationErrors,
    });
  }

  /**
   * Determine tenant type based on the user's role.
   * INTERNAL_ADMIN gets INTERNAL tenant; all others get FAMILY.
   */
  private resolveTenantType(role: UserRole): TenantType {
    return role === UserRole.INTERNAL_ADMIN ? TenantType.INTERNAL : TenantType.FAMILY;
  }

  /**
   * Generate a default tenant name based on display name and type.
   */
  private resolveTenantName(displayName: string, tenantType: TenantType): string {
    if (tenantType === TenantType.INTERNAL) {
      return 'Internal';
    }
    return `${displayName.trim()}'s Family`;
  }
}
