import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthFailureTrackerService } from '../rate-limit/auth-failure-tracker.service';
import { AppConfigService } from '../config/config.service';
import { RegistrationService } from './services/registration.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('AuthController', () => {
  let controller: AuthController;
  let registrationService: RegistrationService;

  const mockAuthFailureTracker = {
    recordLoginFailure: jest.fn().mockResolvedValue(undefined),
    resetFailures: jest.fn().mockResolvedValue(undefined),
  };

  const mockRegistrationService = {
    register: jest.fn().mockResolvedValue({ status: 'ok' }),
  };

  const mockRequest = {
    headers: {
      'x-request-id': 'test-request-id',
    },
    query: {},
    socket: { remoteAddress: '192.168.1.1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validate: validateEnv,
          ignoreEnvFile: true,
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthFailureTrackerService,
          useValue: mockAuthFailureTracker,
        },
        {
          provide: RegistrationService,
          useValue: mockRegistrationService,
        },
        AppConfigService,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    registrationService = module.get<RegistrationService>(RegistrationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'MyStr0ng!Pass',
      displayName: 'New User',
    };

    it('should return { status: "ok" }', async () => {
      const result = await controller.register(registerDto as never, mockRequest as never);
      expect(result).toEqual({ status: 'ok' });
    });

    it('should delegate to RegistrationService', async () => {
      await controller.register(registerDto as never, mockRequest as never);

      expect(registrationService.register).toHaveBeenCalledWith(
        registerDto,
        expect.any(String), // ipHash
        'test-request-id', // requestId
      );
    });

    it('should use "unknown" as requestId when header is missing', async () => {
      const reqWithoutId = { ...mockRequest, headers: {} };
      await controller.register(registerDto as never, reqWithoutId as never);

      expect(registrationService.register).toHaveBeenCalledWith(
        registerDto,
        expect.any(String),
        'unknown',
      );
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockRequest as never,
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.message).toBe('Login successful');
    });

    it('should reset failure counts on successful login', async () => {
      await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockRequest as never,
      );

      expect(mockAuthFailureTracker.resetFailures).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      await expect(
        controller.login({ email: 'wrong@example.com', password: 'wrong' }, mockRequest as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should record login failure for invalid credentials', async () => {
      try {
        await controller.login(
          { email: 'wrong@example.com', password: 'wrong' },
          mockRequest as never,
        );
      } catch {
        // Expected to throw
      }

      expect(mockAuthFailureTracker.recordLoginFailure).toHaveBeenCalled();
      const calls = mockAuthFailureTracker.recordLoginFailure.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toEqual(expect.any(String)); // IP
      expect(lastCall[1]).toEqual(expect.any(String)); // emailHash
      expect(lastCall[3]).toBe('test-request-id'); // requestId
    });

    it('should use email hash for failure tracking', async () => {
      const email = 'test@example.com';

      try {
        await controller.login({ email, password: 'wrong' }, mockRequest as never);
      } catch {
        // Expected to throw
      }

      const calls = mockAuthFailureTracker.recordLoginFailure.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toBeDefined();
      expect(lastCall[1]).not.toBe(email);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens', async () => {
      const result = await controller.refreshToken({
        refreshToken: 'valid-refresh-token',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('verifyMfa', () => {
    it('should return verified status', async () => {
      const result = await controller.verifyMfa({
        email: 'test@example.com',
        code: '123456',
      });

      expect(result.verified).toBe(true);
    });
  });
});
