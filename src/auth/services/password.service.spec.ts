import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import { AppConfigService } from '../../config/config.service';

describe('PasswordService', () => {
  let service: PasswordService;

  const mockConfigService = {
    bcryptRounds: 4, // Low cost for fast tests
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have algorithm set to bcrypt', () => {
    expect(service.algorithm).toBe('bcrypt');
  });

  describe('hash', () => {
    it('should return a bcrypt hash string', async () => {
      const hash = await service.hash('MyStr0ng!Pass');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('should produce different hashes for the same password (unique salts)', async () => {
      const hash1 = await service.hash('MyStr0ng!Pass');
      const hash2 = await service.hash('MyStr0ng!Pass');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return true for a matching password', async () => {
      const password = 'MyStr0ng!Pass';
      const hash = await service.hash(password);
      const result = await service.verify(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for a non-matching password', async () => {
      const hash = await service.hash('MyStr0ng!Pass');
      const result = await service.verify('WrongPassword1!', hash);
      expect(result).toBe(false);
    });
  });
});
