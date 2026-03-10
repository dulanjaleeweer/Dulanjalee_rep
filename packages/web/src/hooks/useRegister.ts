'use client';

import { useState, useCallback } from 'react';
import {
  RegisterRequest,
  RegisterResult,
  registerUser,
  validatePassword,
  validateEmail,
  validateDisplayName,
  PasswordValidationResult,
} from '@abc-earlysteps/shared';

export type RegisterState = 'idle' | 'submitting' | 'success' | 'error';

export interface UseRegisterReturn {
  state: RegisterState;
  errors: string[];
  passwordValidation: PasswordValidationResult;
  emailError: string | null;
  displayNameError: string | null;
  validateField: (field: string, value: string) => void;
  submit: (data: RegisterRequest) => Promise<void>;
  reset: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const EMPTY_PASSWORD_VALIDATION: PasswordValidationResult = {
  valid: false,
  rules: [],
  strength: 0,
};

export function useRegister(): UseRegisterReturn {
  const [state, setState] = useState<RegisterState>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [passwordValidation, setPasswordValidation] =
    useState<PasswordValidationResult>(EMPTY_PASSWORD_VALIDATION);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const validateField = useCallback((field: string, value: string) => {
    switch (field) {
      case 'password':
        setPasswordValidation(value ? validatePassword(value) : EMPTY_PASSWORD_VALIDATION);
        break;
      case 'email':
        if (value && !validateEmail(value)) {
          setEmailError('Please enter a valid email address');
        } else {
          setEmailError(null);
        }
        break;
      case 'displayName':
        setDisplayNameError(validateDisplayName(value));
        break;
    }
  }, []);

  const submit = useCallback(async (data: RegisterRequest) => {
    setState('submitting');
    setErrors([]);

    // Client-side validation
    const clientErrors: string[] = [];
    if (!validateEmail(data.email)) {
      clientErrors.push('Please enter a valid email address');
    }
    const nameError = validateDisplayName(data.displayName);
    if (nameError) {
      clientErrors.push(nameError);
    }
    const pwResult = validatePassword(data.password);
    if (!pwResult.valid) {
      clientErrors.push('Password does not meet requirements');
    }

    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      setState('error');
      return;
    }

    const result: RegisterResult = await registerUser(API_BASE_URL, data);

    if (result.success) {
      setState('success');
    } else {
      setErrors(result.errors);
      setState('error');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setErrors([]);
    setPasswordValidation(EMPTY_PASSWORD_VALIDATION);
    setEmailError(null);
    setDisplayNameError(null);
  }, []);

  return {
    state,
    errors,
    passwordValidation,
    emailError,
    displayNameError,
    validateField,
    submit,
    reset,
  };
}
