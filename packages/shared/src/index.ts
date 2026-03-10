export {
  UserRole,
  USER_ROLE_LABELS,
  PUBLIC_REGISTRATION_ROLES,
} from './types';
export type {
  RegisterRequest,
  RegisterResponse,
  ApiErrorResponse,
} from './types';

export {
  validatePassword,
  validateEmail,
  validateDisplayName,
  countCategories,
  isCommonPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_CATEGORIES,
} from './validation';
export type { PasswordRule, PasswordValidationResult } from './validation';

export { registerUser } from './api';
export type { RegisterResult } from './api';
