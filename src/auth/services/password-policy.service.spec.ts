import { PasswordPolicyService } from './password-policy.service';

describe('PasswordPolicyService', () => {
  let service: PasswordPolicyService;

  beforeEach(() => {
    service = new PasswordPolicyService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    describe('length rules', () => {
      it('should reject passwords shorter than 12 characters', () => {
        const result = service.validate('Short1!abc');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 12 characters');
      });

      it('should reject passwords longer than 72 characters', () => {
        const long = 'Aa1!' + 'x'.repeat(70);
        const result = service.validate(long);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must not exceed 72 characters');
      });

      it('should accept passwords of exactly 12 characters', () => {
        const result = service.validate('Abcdefgh1!23');
        expect(result.valid).toBe(true);
      });

      it('should accept passwords of exactly 72 characters', () => {
        const pw = 'Aa1!' + 'x'.repeat(68);
        const result = service.validate(pw);
        expect(result.valid).toBe(true);
      });
    });

    describe('character category rules (3 of 4)', () => {
      it('should accept lower + upper + digit (3 categories)', () => {
        const result = service.validate('Abcdefghij12');
        expect(result.valid).toBe(true);
      });

      it('should accept lower + upper + symbol (3 categories)', () => {
        const result = service.validate('Abcdefghij!!');
        expect(result.valid).toBe(true);
      });

      it('should accept lower + digit + symbol (3 categories)', () => {
        const result = service.validate('abcdefghij1!');
        expect(result.valid).toBe(true);
      });

      it('should accept upper + digit + symbol (3 categories)', () => {
        const result = service.validate('ABCDEFGHIJ1!');
        expect(result.valid).toBe(true);
      });

      it('should accept all 4 categories', () => {
        const result = service.validate('Abcdefgh1!23');
        expect(result.valid).toBe(true);
      });

      it('should reject only 2 categories (lower + upper)', () => {
        const result = service.validate('Abcdefghijkl');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Password must contain at least 3 of: lowercase letter, uppercase letter, digit, symbol',
        );
      });

      it('should reject only 2 categories (lower + digit)', () => {
        const result = service.validate('abcdefghij12');
        expect(result.valid).toBe(false);
      });

      it('should reject only 1 category (all lowercase)', () => {
        const result = service.validate('abcdefghijkl');
        expect(result.valid).toBe(false);
      });
    });

    describe('common password denylist', () => {
      it('should reject "password" (case-insensitive)', () => {
        // This also fails length but test denylist specifically
        const result = service.validate('password');
        expect(result.errors).toContain('Password is too common and easily guessed');
      });

      it('should reject common passwords case-insensitively', () => {
        const result = service.validate('PASSWORD123');
        expect(result.errors).toContain('Password is too common and easily guessed');
      });

      it('should reject "qwerty123" (common)', () => {
        const result = service.validate('qwerty123');
        expect(result.errors).toContain('Password is too common and easily guessed');
      });

      it('should not reject unique passwords', () => {
        const result = service.validate('Xk9$mPwQ2!vR');
        expect(result.errors).not.toContain('Password is too common and easily guessed');
      });
    });

    describe('multiple errors', () => {
      it('should return all applicable errors', () => {
        const result = service.validate('short');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('valid passwords', () => {
      it('should accept a strong password', () => {
        const result = service.validate('MyStr0ng!Pass');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept a long complex password', () => {
        const result = service.validate('Th!s1sAVeryStr0ngP@ssw0rd');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});
