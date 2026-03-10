import {
  validatePassword,
  validateEmail,
  validateDisplayName,
  countCategories,
  isCommonPassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from './validation';

describe('validatePassword', () => {
  it('should accept a strong password', () => {
    const result = validatePassword('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.strength).toBeGreaterThanOrEqual(3);
  });

  it('should reject passwords shorter than minimum length', () => {
    const result = validatePassword('Short1!aB');
    expect(result.valid).toBe(false);
    const minRule = result.rules.find((r) => r.key === 'minLength');
    expect(minRule?.met).toBe(false);
  });

  it('should reject passwords exceeding max length', () => {
    const longPassword = 'Aa1!' + 'x'.repeat(MAX_PASSWORD_LENGTH);
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(false);
    const maxRule = result.rules.find((r) => r.key === 'maxLength');
    expect(maxRule?.met).toBe(false);
  });

  it('should reject passwords with fewer than 3 character categories', () => {
    // Only lowercase — 1 category
    const result = validatePassword('alllowercaseonly');
    expect(result.valid).toBe(false);
  });

  it('should accept passwords with exactly 3 character categories', () => {
    // lowercase + uppercase + digit = 3
    const result = validatePassword('SecurePass1234');
    expect(result.valid).toBe(true);
  });

  it('should reject common passwords', () => {
    const result = validatePassword('password1234');
    expect(result.valid).toBe(false);
    const commonRule = result.rules.find((r) => r.key === 'notCommon');
    expect(commonRule?.met).toBe(false);
  });

  it('should detect common passwords case-insensitively', () => {
    const result = validatePassword('PASSWORD1234');
    expect(result.valid).toBe(false);
  });

  it('should return all individual rules', () => {
    const result = validatePassword('Test1234!abc');
    expect(result.rules.length).toBe(7);
    expect(result.rules.map((r) => r.key)).toEqual([
      'minLength',
      'maxLength',
      'lowercase',
      'uppercase',
      'digit',
      'symbol',
      'notCommon',
    ]);
  });

  it('should return strength 0 for empty password', () => {
    const result = validatePassword('');
    expect(result.strength).toBe(0);
    expect(result.valid).toBe(false);
  });

  it('should return strength 4 for very strong password', () => {
    const result = validatePassword('MyV3ryStr0ng!Pass');
    expect(result.strength).toBe(4);
  });

  it('should not flag empty string as common password', () => {
    const result = validatePassword('');
    const commonRule = result.rules.find((r) => r.key === 'notCommon');
    expect(commonRule?.met).toBe(true);
  });
});

describe('countCategories', () => {
  it('should count 0 for empty string', () => {
    expect(countCategories('')).toBe(0);
  });

  it('should count 1 for lowercase only', () => {
    expect(countCategories('abcdef')).toBe(1);
  });

  it('should count 2 for lowercase + uppercase', () => {
    expect(countCategories('abcDEF')).toBe(2);
  });

  it('should count 3 for lowercase + uppercase + digit', () => {
    expect(countCategories('abcDEF123')).toBe(3);
  });

  it('should count 4 for all categories', () => {
    expect(countCategories('abcDEF123!')).toBe(4);
  });
});

describe('isCommonPassword', () => {
  it('should identify common passwords', () => {
    expect(isCommonPassword('password')).toBe(true);
    expect(isCommonPassword('qwerty')).toBe(true);
    expect(isCommonPassword('123456')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isCommonPassword('PASSWORD')).toBe(true);
    expect(isCommonPassword('Qwerty')).toBe(true);
  });

  it('should not flag unique passwords', () => {
    expect(isCommonPassword('xK9$mP2vL8nQ')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
  });
});

describe('validateDisplayName', () => {
  it('should accept valid names', () => {
    expect(validateDisplayName('Jane Doe')).toBeNull();
  });

  it('should reject empty names', () => {
    expect(validateDisplayName('')).toBe('Display name is required');
    expect(validateDisplayName('   ')).toBe('Display name is required');
  });

  it('should reject names exceeding 255 characters', () => {
    const longName = 'A'.repeat(256);
    expect(validateDisplayName(longName)).toBe('Display name must not exceed 255 characters');
  });
});

describe('constants', () => {
  it('should match backend password policy constants', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(MAX_PASSWORD_LENGTH).toBe(72);
  });
});
