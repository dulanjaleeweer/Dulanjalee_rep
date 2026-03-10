import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../../config/config.service';

/**
 * Service for secure password hashing and verification using bcrypt.
 *
 * Uses configurable cost factor (default 12) via BCRYPT_ROUNDS env var.
 * The `passwordAlgo` field stored alongside hashes supports future
 * migration to argon2id without breaking existing credentials.
 */
@Injectable()
export class PasswordService {
  /** Algorithm identifier stored in UserCredentials.passwordAlgo */
  readonly algorithm = 'bcrypt';

  constructor(private readonly configService: AppConfigService) {}

  /**
   * Hash a plaintext password with bcrypt.
   * Cost factor is read from config (default 12, ~250ms on modern hardware).
   */
  async hash(password: string): Promise<string> {
    const rounds = this.configService.bcryptRounds;
    const salt = await bcrypt.genSalt(rounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify a plaintext password against a bcrypt hash.
   * Uses bcrypt's built-in constant-time comparison.
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
