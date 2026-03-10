import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../entities/enums';

/**
 * DTO for POST /auth/register
 *
 * Validation is handled by NestJS global ValidationPipe (whitelist + transform).
 * Password policy (3-of-4 categories, denylist) is enforced in RegistrationService
 * rather than at DTO level, for cleaner error messages and separation of concerns.
 */
export class RegisterDto {
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(72, { message: 'Password must not exceed 72 characters' })
  password!: string;

  @IsString()
  @MinLength(1, { message: 'Display name is required' })
  @MaxLength(255)
  displayName!: string;

  @IsEnum(UserRole, { message: 'role must be a valid UserRole value' })
  @IsOptional()
  role: UserRole = UserRole.FAMILY_OWNER;

  @IsBoolean()
  @IsOptional()
  acceptTerms?: boolean;
}
