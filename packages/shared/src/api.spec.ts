import { registerUser } from './api';
import { UserRole } from './types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const BASE_URL = 'https://api.example.com';

const validPayload = {
  email: 'test@example.com',
  password: 'SecurePass123!',
  displayName: 'Test User',
  role: UserRole.FAMILY_OWNER,
  acceptTerms: true,
};

describe('registerUser', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should return success on 201 response', async () => {
    mockFetch.mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('ok');
    }

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('should handle trailing slash in baseUrl', async () => {
    mockFetch.mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    await registerUser('https://api.example.com/', validPayload);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/auth/register',
      expect.anything(),
    );
  });

  it('should handle 429 rate limit response', async () => {
    mockFetch.mockResolvedValue({
      status: 429,
      headers: { get: (name: string) => (name === 'Retry-After' ? '30' : null) },
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(429);
      expect(result.errors[0]).toContain('30 seconds');
    }
  });

  it('should handle 429 without Retry-After header', async () => {
    mockFetch.mockResolvedValue({
      status: 429,
      headers: { get: () => null },
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('60 seconds');
    }
  });

  it('should handle 400 validation error with array message', async () => {
    mockFetch.mockResolvedValue({
      status: 400,
      json: () =>
        Promise.resolve({
          statusCode: 400,
          message: ['Password must be at least 12 characters', 'Password is too common'],
          error: 'Bad Request',
        }),
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(400);
      expect(result.errors).toHaveLength(2);
    }
  });

  it('should handle 400 validation error with string message', async () => {
    mockFetch.mockResolvedValue({
      status: 400,
      json: () =>
        Promise.resolve({
          statusCode: 400,
          message: 'Validation failed',
          error: 'Bad Request',
        }),
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Validation failed']);
    }
  });

  it('should handle non-JSON error responses', async () => {
    mockFetch.mockResolvedValue({
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(500);
      expect(result.errors[0]).toContain('try again');
    }
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await registerUser(BASE_URL, validPayload);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.statusCode).toBe(0);
      expect(result.errors[0]).toContain('internet connection');
    }
  });
});
