import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';
import { UserRole } from '../../entities/enums';

describe('RegisterDto', () => {
  function createDto(partial: Partial<RegisterDto> = {}): RegisterDto {
    return plainToInstance(RegisterDto, {
      email: 'test@example.com',
      password: 'MyStr0ng!Pass',
      displayName: 'Test User',
      role: UserRole.FAMILY_OWNER,
      ...partial,
    });
  }

  describe('email', () => {
    it('should accept a valid email', async () => {
      const dto = createDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject an invalid email', async () => {
      const dto = createDto({ email: 'not-an-email' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should reject an empty email', async () => {
      const dto = createDto({ email: '' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('password', () => {
    it('should accept a valid password', async () => {
      const dto = createDto({ password: 'ValidPass123!' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject a password shorter than 12 chars', async () => {
      const dto = createDto({ password: 'Short1!' });
      const errors = await validate(dto);
      const pwError = errors.find((e) => e.property === 'password');
      expect(pwError).toBeDefined();
    });

    it('should reject a password longer than 72 chars', async () => {
      const dto = createDto({ password: 'A'.repeat(73) });
      const errors = await validate(dto);
      const pwError = errors.find((e) => e.property === 'password');
      expect(pwError).toBeDefined();
    });
  });

  describe('displayName', () => {
    it('should accept a valid display name', async () => {
      const dto = createDto({ displayName: 'Test' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject an empty display name', async () => {
      const dto = createDto({ displayName: '' });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'displayName');
      expect(nameError).toBeDefined();
    });
  });

  describe('role', () => {
    it('should default to FAMILY_OWNER', () => {
      const dto = plainToInstance(RegisterDto, {
        email: 'test@example.com',
        password: 'MyStr0ng!Pass',
        displayName: 'Test',
      });
      expect(dto.role).toBe(UserRole.FAMILY_OWNER);
    });

    it('should accept a valid role', async () => {
      const dto = createDto({ role: UserRole.INTERNAL_ADMIN });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject an invalid role', async () => {
      const dto = createDto({ role: 'INVALID_ROLE' as UserRole });
      const errors = await validate(dto);
      const roleError = errors.find((e) => e.property === 'role');
      expect(roleError).toBeDefined();
    });
  });

  describe('acceptTerms', () => {
    it('should be optional', async () => {
      const dto = createDto();
      delete dto.acceptTerms;
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept true', async () => {
      const dto = createDto({ acceptTerms: true });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept false', async () => {
      const dto = createDto({ acceptTerms: false });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
