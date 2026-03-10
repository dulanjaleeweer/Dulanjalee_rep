/**
 * Shared enum types for the ABC EarlySteps data model.
 *
 * These enums are used both by TypeORM entities and by DTOs/services,
 * so they live in a shared location rather than alongside a single entity.
 */

export enum TenantType {
  FAMILY = 'FAMILY',
  ORGANIZATION = 'ORGANIZATION',
  INTERNAL = 'INTERNAL',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum UserRole {
  FAMILY_OWNER = 'FAMILY_OWNER',
  CAREGIVER = 'CAREGIVER',
  PROFESSIONAL_THERAPIST = 'PROFESSIONAL_THERAPIST',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  INTERNAL_ADMIN = 'INTERNAL_ADMIN',
}
