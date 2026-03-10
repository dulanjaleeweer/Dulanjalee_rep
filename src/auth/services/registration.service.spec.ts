import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RegistrationService } from './registration.service';
import { PasswordService } from './password.service';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityAuditService } from '../../security-audit/security-audit.service';
import { MetricsService } from '../../metrics/metrics.service';
import { RegisterDto } from '../dto/register.dto';
import { UserRole, TenantType, UserStatus } from '../../entities/enums';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let passwordService: PasswordService;
  let securityAuditService: SecurityAuditService;
  let metricsService: MetricsService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn().mockImplementation((_entity, data) => data),
      save: jest.fn().mockImplementation((_entity, data) => {
        // Return saved entities with generated IDs
        if (!data.id && data.type) return { ...data, id: 'tenant-uuid' };
        if (!data.id && data.email) return { ...data, id: 'user-uuid' };
        return data;
      }),
    },
  };

  const mockUserRepository = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    getRepository: jest.fn().mockReturnValue(mockUserRepository),
  };

  const mockPasswordService = {
    hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
    verify: jest.fn(),
    algorithm: 'bcrypt',
  };

  const mockSecurityAuditService = {
    logRegistrationAttempt: jest.fn(),
    hashEmail: jest.fn().mockReturnValue('hashed-email-abc'),
  };

  const mockMetricsService = {
    incrementRegistrationAttempt: jest.fn(),
    incrementRegistrationSuccess: jest.fn(),
    incrementRegistrationDuplicate: jest.fn(),
    incrementRegistrationValidationFailed: jest.fn(),
    incrementRegistrationError: jest.fn(),
  };

  const validDto: RegisterDto = {
    email: 'newuser@example.com',
    password: 'MyStr0ng!Pass',
    displayName: 'New User',
    role: UserRole.FAMILY_OWNER,
    acceptTerms: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: SecurityAuditService, useValue: mockSecurityAuditService },
        { provide: MetricsService, useValue: mockMetricsService },
        PasswordPolicyService,
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    passwordService = module.get<PasswordService>(PasswordService);
    securityAuditService = module.get<SecurityAuditService>(SecurityAuditService);
    metricsService = module.get<MetricsService>(MetricsService);

    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue(null);
    mockQueryRunner.manager.save.mockImplementation((_entity, data) => {
      if (!data.id && data.type) return { ...data, id: 'tenant-uuid' };
      if (!data.id && data.email) return { ...data, id: 'user-uuid' };
      return data;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('successful registration', () => {
    it('should return { status: "ok" }', async () => {
      const result = await service.register(validDto, 'ip-hash', 'req-1');
      expect(result).toEqual({ status: 'ok' });
    });

    it('should create tenant, user, credentials, and role in a transaction', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(4);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create a FAMILY tenant for non-admin roles', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      const tenantCreateCall = mockQueryRunner.manager.create.mock.calls[0];
      expect(tenantCreateCall[1]).toMatchObject({
        type: TenantType.FAMILY,
        name: "New User's Family",
      });
    });

    it('should create an INTERNAL tenant for INTERNAL_ADMIN role', async () => {
      const adminDto = { ...validDto, role: UserRole.INTERNAL_ADMIN };
      await service.register(adminDto, 'ip-hash', 'req-1');

      const tenantCreateCall = mockQueryRunner.manager.create.mock.calls[0];
      expect(tenantCreateCall[1]).toMatchObject({
        type: TenantType.INTERNAL,
        name: 'Internal',
      });
    });

    it('should normalize email to lowercase', async () => {
      const dto = { ...validDto, email: '  Test@EXAMPLE.com  ' };
      await service.register(dto, 'ip-hash', 'req-1');

      const userCreateCall = mockQueryRunner.manager.create.mock.calls[1];
      expect(userCreateCall[1].emailNormalized).toBe('test@example.com');
    });

    it('should set user status to PENDING_VERIFICATION', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      const userCreateCall = mockQueryRunner.manager.create.mock.calls[1];
      expect(userCreateCall[1].status).toBe(UserStatus.PENDING_VERIFICATION);
    });

    it('should set acceptTermsAt when acceptTerms is true', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      const userCreateCall = mockQueryRunner.manager.create.mock.calls[1];
      expect(userCreateCall[1].acceptTermsAt).toBeInstanceOf(Date);
    });

    it('should set acceptTermsAt to null when acceptTerms is false', async () => {
      const dto = { ...validDto, acceptTerms: false };
      await service.register(dto, 'ip-hash', 'req-1');

      const userCreateCall = mockQueryRunner.manager.create.mock.calls[1];
      expect(userCreateCall[1].acceptTermsAt).toBeNull();
    });

    it('should hash the password via PasswordService', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      expect(passwordService.hash).toHaveBeenCalledWith(validDto.password);
    });

    it('should store bcrypt algorithm identifier on credentials', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      const credCreateCall = mockQueryRunner.manager.create.mock.calls[2];
      expect(credCreateCall[1]).toMatchObject({
        passwordHash: '$2b$12$hashedpassword',
        passwordAlgo: 'bcrypt',
      });
    });

    it('should assign the requested role', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      const roleCreateCall = mockQueryRunner.manager.create.mock.calls[3];
      expect(roleCreateCall[1]).toMatchObject({
        role: UserRole.FAMILY_OWNER,
      });
    });

    it('should emit audit event with outcome "created"', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      expect(securityAuditService.logRegistrationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'created',
          emailHash: 'hashed-email-abc',
          ipHash: 'ip-hash',
          requestId: 'req-1',
          role: UserRole.FAMILY_OWNER,
          tenantType: TenantType.FAMILY,
          userId: 'user-uuid',
          tenantId: 'tenant-uuid',
        }),
      );
    });

    it('should increment attempt and success metrics', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      expect(metricsService.incrementRegistrationAttempt).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationSuccess).toHaveBeenCalledWith(
        UserRole.FAMILY_OWNER,
      );
    });

    it('should hash email via securityAuditService.hashEmail', async () => {
      await service.register(validDto, 'ip-hash', 'req-1');

      expect(securityAuditService.hashEmail).toHaveBeenCalledWith(validDto.email);
    });
  });

  describe('duplicate email (anti-enumeration)', () => {
    it('should return { status: "ok" } for existing email', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      const result = await service.register(validDto, 'ip-hash', 'req-1');
      expect(result).toEqual({ status: 'ok' });
    });

    it('should not start a transaction for existing email', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await service.register(validDto, 'ip-hash', 'req-1');
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
    });

    it('should still hash the password to prevent timing attacks', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await service.register(validDto, 'ip-hash', 'req-1');
      expect(passwordService.hash).toHaveBeenCalledWith(validDto.password);
    });

    it('should emit audit event with outcome "duplicate"', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await service.register(validDto, 'ip-hash', 'req-1');

      expect(securityAuditService.logRegistrationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'duplicate',
          emailHash: 'hashed-email-abc',
          ipHash: 'ip-hash',
          requestId: 'req-1',
        }),
      );
    });

    it('should not include userId or tenantId in duplicate audit event', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await service.register(validDto, 'ip-hash', 'req-1');

      const call = mockSecurityAuditService.logRegistrationAttempt.mock.calls[0][0];
      expect(call.userId).toBeUndefined();
      expect(call.tenantId).toBeUndefined();
    });

    it('should increment attempt and duplicate metrics', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user' });

      await service.register(validDto, 'ip-hash', 'req-1');

      expect(metricsService.incrementRegistrationAttempt).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationDuplicate).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('password policy validation', () => {
    it('should throw BadRequestException for weak password', async () => {
      const dto = { ...validDto, password: 'short' };
      await expect(service.register(dto, 'ip-hash', 'req-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject before checking database', async () => {
      const dto = { ...validDto, password: 'short' };
      try {
        await service.register(dto, 'ip-hash', 'req-1');
      } catch {
        // Expected
      }
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should emit audit event with outcome "validation_failed"', async () => {
      const dto = { ...validDto, password: 'short' };
      try {
        await service.register(dto, 'ip-hash', 'req-1');
      } catch {
        // Expected
      }

      expect(securityAuditService.logRegistrationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'validation_failed',
          validationErrors: expect.arrayContaining([
            expect.stringContaining('at least 12 characters'),
          ]),
        }),
      );
    });

    it('should increment attempt and validation_failed metrics', async () => {
      const dto = { ...validDto, password: 'short' };
      try {
        await service.register(dto, 'ip-hash', 'req-1');
      } catch {
        // Expected
      }

      expect(metricsService.incrementRegistrationAttempt).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationValidationFailed).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('transaction failure', () => {
    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.register(validDto, 'ip-hash', 'req-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on transaction failure', async () => {
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.register(validDto, 'ip-hash', 'req-1')).rejects.toThrow(
        'Registration failed',
      );
    });

    it('should emit audit event with outcome "error"', async () => {
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      try {
        await service.register(validDto, 'ip-hash', 'req-1');
      } catch {
        // Expected
      }

      expect(securityAuditService.logRegistrationAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'error',
          emailHash: 'hashed-email-abc',
          ipHash: 'ip-hash',
          requestId: 'req-1',
        }),
      );
    });

    it('should increment attempt and error metrics', async () => {
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB error'));

      try {
        await service.register(validDto, 'ip-hash', 'req-1');
      } catch {
        // Expected
      }

      expect(metricsService.incrementRegistrationAttempt).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationError).toHaveBeenCalledTimes(1);
      expect(metricsService.incrementRegistrationSuccess).not.toHaveBeenCalled();
    });
  });
});
