/**
 * Shared types for ABC EarlySteps registration UI.
 * Mirrors backend enums and DTOs for type safety across web and mobile.
 */

/** User roles — mirrors backend UserRole enum */
export enum UserRole {
  FAMILY_OWNER = 'FAMILY_OWNER',
  CAREGIVER = 'CAREGIVER',
  PROFESSIONAL_THERAPIST = 'PROFESSIONAL_THERAPIST',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  INTERNAL_ADMIN = 'INTERNAL_ADMIN',
}

/** Human-readable labels for user roles */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.FAMILY_OWNER]: 'Family Owner',
  [UserRole.CAREGIVER]: 'Caregiver',
  [UserRole.PROFESSIONAL_THERAPIST]: 'Professional Therapist',
  [UserRole.ORGANIZATION_ADMIN]: 'Organization Admin',
  [UserRole.INTERNAL_ADMIN]: 'Internal Admin',
};

/** Roles available for public self-registration */
export const PUBLIC_REGISTRATION_ROLES: UserRole[] = [
  UserRole.FAMILY_OWNER,
  UserRole.CAREGIVER,
  UserRole.PROFESSIONAL_THERAPIST,
];

/** Registration request payload — mirrors backend RegisterDto */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  acceptTerms?: boolean;
}

/** Registration response — always { status: 'ok' } for anti-enumeration */
export interface RegisterResponse {
  status: string;
}

/** API error response shape from NestJS */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
