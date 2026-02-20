import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthFailureTrackerService } from '../rate-limit/auth-failure-tracker.service';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../config/env.validation';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthFailureTracker = {
    recordLoginFailure: jest.fn().mockResolvedValue(undefined),
    resetFailures: jest.fn().mockResolvedValue(undefined),
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
        AppConfigService,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
      // Verify the call was made with IP, email hash, and request ID
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

      // Should be called with hashed email (get last call)
      const calls = mockAuthFailureTracker.recordLoginFailure.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1]).toBeDefined(); // emailHash should be provided
      expect(lastCall[1]).not.toBe(email); // should be hashed, not raw
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
