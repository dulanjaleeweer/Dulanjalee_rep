/**
 * Client-side password validation — mirrors backend PasswordPolicyService.
 *
 * Provides real-time feedback as the user types, without round-tripping
 * to the server. Rules are intentionally duplicated from the backend
 * for instant UX; the server remains the authoritative validator.
 */

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 12;

/** Maximum password length (bcrypt limit) */
export const MAX_PASSWORD_LENGTH = 72;

/** Minimum character categories required (out of 4) */
export const MIN_CATEGORIES = 3;

/** Individual password rule check result */
export interface PasswordRule {
  /** Machine-readable key */
  key: string;
  /** Human-readable label */
  label: string;
  /** Whether this rule currently passes */
  met: boolean;
}

/** Overall password validation result */
export interface PasswordValidationResult {
  valid: boolean;
  rules: PasswordRule[];
  /** 0–4 score for strength indicator */
  strength: number;
}

/** Category check helpers */
const hasLowercase = (pw: string): boolean => /[a-z]/.test(pw);
const hasUppercase = (pw: string): boolean => /[A-Z]/.test(pw);
const hasDigit = (pw: string): boolean => /[0-9]/.test(pw);
const hasSymbol = (pw: string): boolean => /[^a-zA-Z0-9]/.test(pw);

/**
 * Count how many of the 4 character categories are present.
 */
export function countCategories(password: string): number {
  let count = 0;
  if (hasLowercase(password)) count++;
  if (hasUppercase(password)) count++;
  if (hasDigit(password)) count++;
  if (hasSymbol(password)) count++;
  return count;
}

/**
 * Subset of the backend common-password denylist (~50 most common).
 * Kept small for bundle size; the server enforces the full ~200 list.
 */
const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  '1234567890',
  '123456789',
  'qwerty',
  'abc123',
  'password1',
  'password123',
  'iloveyou',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  'master',
  'dragon',
  'login',
  'princess',
  'football',
  'shadow',
  'sunshine',
  'trustno1',
  'passw0rd',
  'whatever',
  'qwerty123',
  'baseball',
  'batman',
  'starwars',
  'changeme',
  'default',
  'password12',
  'password1234',
  'p@ssw0rd',
  'p@ssword',
  'admin123',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abcdefgh',
  'abcd1234',
  '1q2w3e4r',
  '1qaz2wsx',
  '123123',
  '111111',
  '000000',
  '654321',
  '121212',
  '666666',
]);

/**
 * Check if password is in the common password denylist (case-insensitive).
 */
export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

/**
 * Validate a password against all policy rules.
 * Returns individual rule results for real-time UI feedback.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const categories = countCategories(password);

  const rules: PasswordRule[] = [
    {
      key: 'minLength',
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      key: 'maxLength',
      label: `No more than ${MAX_PASSWORD_LENGTH} characters`,
      met: password.length <= MAX_PASSWORD_LENGTH,
    },
    {
      key: 'lowercase',
      label: 'Contains a lowercase letter',
      met: hasLowercase(password),
    },
    {
      key: 'uppercase',
      label: 'Contains an uppercase letter',
      met: hasUppercase(password),
    },
    {
      key: 'digit',
      label: 'Contains a number',
      met: hasDigit(password),
    },
    {
      key: 'symbol',
      label: 'Contains a special character',
      met: hasSymbol(password),
    },
    {
      key: 'notCommon',
      label: 'Not a commonly used password',
      met: password.length === 0 || !isCommonPassword(password),
    },
  ];

  // Calculate strength: 0-4
  let strength = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) strength++;
  if (categories >= 2) strength++;
  if (categories >= MIN_CATEGORIES) strength++;
  if (password.length >= 16 && categories >= MIN_CATEGORIES && !isCommonPassword(password)) {
    strength++;
  }

  // Categories policy: at least 3 of 4 required
  const categoryRulesMet = categories >= MIN_CATEGORIES;
  const lengthOk =
    password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
  const notCommon = !isCommonPassword(password);

  const valid = lengthOk && categoryRulesMet && notCommon;

  return { valid, rules, strength };
}

/**
 * Validate email format (basic client-side check).
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  // Simple regex matching common email patterns
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate display name.
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Display name is required';
  if (trimmed.length > 255) return 'Display name must not exceed 255 characters';
  return null;
}
