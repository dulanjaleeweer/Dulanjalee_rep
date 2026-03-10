/**
 * API client for registration endpoint.
 * Platform-agnostic — uses standard fetch API available in both browser and React Native.
 */

import { RegisterRequest, RegisterResponse, ApiErrorResponse } from './types';

/** Result type for registration API call */
export type RegisterResult =
  | { success: true; data: RegisterResponse }
  | { success: false; errors: string[]; statusCode: number };

/**
 * Call POST /api/v1/auth/register.
 *
 * @param baseUrl - API base URL (e.g. 'https://api.earlysteps.example.com')
 * @param payload - Registration data
 * @returns Typed result with success flag
 */
export async function registerUser(
  baseUrl: string,
  payload: RegisterRequest,
): Promise<RegisterResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/auth/register`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.status === 201) {
      const data = (await response.json()) as RegisterResponse;
      return { success: true, data };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const seconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      return {
        success: false,
        errors: [`Too many attempts. Please try again in ${seconds} seconds.`],
        statusCode: 429,
      };
    }

    // 400 = validation error, 503 = service unavailable
    try {
      const errorBody = (await response.json()) as ApiErrorResponse;
      const messages = Array.isArray(errorBody.message)
        ? errorBody.message
        : [errorBody.message || 'Registration failed'];
      return { success: false, errors: messages, statusCode: response.status };
    } catch {
      return {
        success: false,
        errors: ['Registration failed. Please try again.'],
        statusCode: response.status,
      };
    }
  } catch {
    return {
      success: false,
      errors: ['Unable to connect. Please check your internet connection and try again.'],
      statusCode: 0,
    };
  }
}
