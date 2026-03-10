/**
 * Tests for useRegister hook.
 *
 * Uses react-test-renderer for a lightweight test approach
 * that doesn't require the full React Native runtime.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { UserRole } from '@abc-earlysteps/shared';

// Mock the shared package's registerUser
jest.mock('@abc-earlysteps/shared', () => {
  const actual = jest.requireActual('@abc-earlysteps/shared');
  return {
    ...actual,
    registerUser: jest.fn(),
  };
});

import { registerUser } from '@abc-earlysteps/shared';
const mockRegisterUser = registerUser as jest.MockedFunction<typeof registerUser>;

// Dynamic import after mock setup
let useRegister: typeof import('./useRegister').useRegister;
beforeAll(() => {
  useRegister = require('./useRegister').useRegister;
});

/** Lightweight renderHook using react-test-renderer */
function renderHook<T>(hookFn: () => T) {
  const result = { current: null as T };

  function TestComponent() {
    result.current = hookFn();
    return null;
  }

  const renderer = TestRenderer.create(React.createElement(TestComponent));

  return {
    result,
    unmount: () => renderer.unmount(),
  };
}

describe('useRegister', () => {
  beforeEach(() => {
    mockRegisterUser.mockClear();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useRegister());

    expect(result.current.state).toBe('idle');
    expect(result.current.errors).toEqual([]);
  });

  it('should validate password field', () => {
    const { result } = renderHook(() => useRegister());

    TestRenderer.act(() => {
      result.current.validateField('password', 'SecurePass123!');
    });

    expect(result.current.passwordValidation.valid).toBe(true);
    expect(result.current.passwordValidation.strength).toBeGreaterThan(0);
  });

  it('should validate email field', () => {
    const { result } = renderHook(() => useRegister());

    TestRenderer.act(() => {
      result.current.validateField('email', 'invalid');
    });

    expect(result.current.emailError).toBe('Please enter a valid email address');

    TestRenderer.act(() => {
      result.current.validateField('email', 'valid@example.com');
    });

    expect(result.current.emailError).toBeNull();
  });

  it('should validate displayName field', () => {
    const { result } = renderHook(() => useRegister());

    TestRenderer.act(() => {
      result.current.validateField('displayName', '');
    });

    expect(result.current.displayNameError).toBe('Display name is required');

    TestRenderer.act(() => {
      result.current.validateField('displayName', 'Jane Doe');
    });

    expect(result.current.displayNameError).toBeNull();
  });

  it('should reject client-side invalid data', async () => {
    const { result } = renderHook(() => useRegister());

    await TestRenderer.act(async () => {
      await result.current.submit({
        email: 'bad',
        password: 'short',
        displayName: '',
        role: UserRole.FAMILY_OWNER,
      });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errors.length).toBeGreaterThan(0);
    expect(mockRegisterUser).not.toHaveBeenCalled();
  });

  it('should call registerUser on valid data', async () => {
    mockRegisterUser.mockResolvedValue({
      success: true,
      data: { status: 'ok' },
    });

    const { result } = renderHook(() => useRegister());

    await TestRenderer.act(async () => {
      await result.current.submit({
        email: 'jane@example.com',
        password: 'SecurePass123!',
        displayName: 'Jane Doe',
        role: UserRole.FAMILY_OWNER,
      });
    });

    expect(result.current.state).toBe('success');
    expect(mockRegisterUser).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors', async () => {
    mockRegisterUser.mockResolvedValue({
      success: false,
      errors: ['Password must be at least 12 characters'],
      statusCode: 400,
    });

    const { result } = renderHook(() => useRegister());

    await TestRenderer.act(async () => {
      await result.current.submit({
        email: 'jane@example.com',
        password: 'SecurePass123!',
        displayName: 'Jane Doe',
        role: UserRole.FAMILY_OWNER,
      });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errors).toContain('Password must be at least 12 characters');
  });

  it('should reset state', async () => {
    mockRegisterUser.mockResolvedValue({
      success: true,
      data: { status: 'ok' },
    });

    const { result } = renderHook(() => useRegister());

    await TestRenderer.act(async () => {
      await result.current.submit({
        email: 'jane@example.com',
        password: 'SecurePass123!',
        displayName: 'Jane Doe',
        role: UserRole.FAMILY_OWNER,
      });
    });

    expect(result.current.state).toBe('success');

    TestRenderer.act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.errors).toEqual([]);
  });
});
