import { Injectable } from '@nestjs/common';

/**
 * Result of password policy validation
 */
export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

/** Minimum password length (bcrypt practical minimum for security) */
const MIN_LENGTH = 12;

/** Maximum password length (bcrypt truncates at 72 bytes) */
const MAX_LENGTH = 72;

/** Minimum number of character categories required (out of 4) */
const MIN_CATEGORIES = 3;

/**
 * Common passwords denylist (top ~200 most common).
 * Passwords are lowercased for case-insensitive comparison.
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
  'access',
  'hello',
  'charlie',
  'donald',
  'loveme',
  'michael',
  'jordan',
  'superman',
  'harley',
  'robert',
  'daniel',
  'hannah',
  'thomas',
  'andrew',
  'joshua',
  'jessica',
  'jennifer',
  'ginger',
  'ranger',
  'buster',
  'bailey',
  'hunter',
  'soccer',
  'george',
  'pepper',
  'andrea',
  'amanda',
  'nicole',
  'ashley',
  'cookie',
  'justin',
  'summer',
  'sparky',
  'cheese',
  'flower',
  'butter',
  'junior',
  'london',
  'silver',
  'purple',
  'orange',
  'banana',
  'chicken',
  'matrix',
  'merlin',
  'midnight',
  'diamond',
  'jackson',
  'freedom',
  'thunder',
  'mustang',
  'dallas',
  'yankees',
  'austin',
  'maggie',
  'taylor',
  'muffin',
  'corvette',
  'camaro',
  'tigers',
  'panther',
  'falcon',
  'marina',
  'maverick',
  'mercedes',
  'hockey',
  'knight',
  'sandiego',
  'iceman',
  'phoenix',
  'dakota',
  'compaq',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abcdefgh',
  'abcd1234',
  'password12',
  'password1234',
  'changeme',
  'default',
  'internet',
  'computer',
  'google',
  'master1',
  'test1234',
  'administrator',
  'qwerty1234',
  'welcome1',
  'welcome123',
  'p@ssw0rd',
  'p@ssword',
  '1q2w3e4r',
  '1qaz2wsx',
  'zaq1xsw2',
  'passpass',
  'pass1234',
  'password!',
  'letmein123',
  'admin123',
  'root1234',
  'toor1234',
  'iloveyou1',
  'sunshine1',
  'princess1',
  'football1',
  'baseball1',
  'trustno1!',
  'monkey123',
  'dragon123',
  'shadow123',
  'master123',
  'qwerty12345',
  'abc12345',
  '123qweasd',
  'aaaaaa',
  'asdfasdf',
  '123123',
  '111111',
  '000000',
  '654321',
  '121212',
  '666666',
  '696969',
  '112233',
  '159753',
  '789456',
  '101010',
  '232323',
  '252525',
  '131313',
  '142536',
  '987654',
  '999999',
  '777777',
  '888888',
  '555555',
  '1234abcd',
  'abcdef',
  'fedcba',
  'aabbcc',
  'abc12345678',
]);

/**
 * Service for validating passwords against security policy.
 *
 * Policy rules:
 * - Length: 12-72 characters
 * - Complexity: at least 3 of 4 character categories (lower, upper, digit, symbol)
 * - Denylist: rejects common/breached passwords
 */
@Injectable()
export class PasswordPolicyService {
  /**
   * Validate a password against all policy rules.
   * Returns all violations (not just the first) for better UX.
   */
  validate(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (password.length < MIN_LENGTH) {
      errors.push(`Password must be at least ${MIN_LENGTH} characters`);
    }

    if (password.length > MAX_LENGTH) {
      errors.push(`Password must not exceed ${MAX_LENGTH} characters`);
    }

    const categories = this.countCategories(password);
    if (categories < MIN_CATEGORIES) {
      errors.push(
        'Password must contain at least 3 of: lowercase letter, uppercase letter, digit, symbol',
      );
    }

    if (this.isCommonPassword(password)) {
      errors.push('Password is too common and easily guessed');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Count how many of the 4 character categories are present.
   */
  private countCategories(password: string): number {
    let count = 0;
    if (/[a-z]/.test(password)) count++;
    if (/[A-Z]/.test(password)) count++;
    if (/[0-9]/.test(password)) count++;
    if (/[^a-zA-Z0-9]/.test(password)) count++;
    return count;
  }

  /**
   * Check if password appears in the common passwords denylist.
   * Comparison is case-insensitive.
   */
  private isCommonPassword(password: string): boolean {
    return COMMON_PASSWORDS.has(password.toLowerCase());
  }
}
