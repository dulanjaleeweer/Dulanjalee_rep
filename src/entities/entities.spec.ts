import { TenantType, UserStatus, UserRole } from './enums';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { UserCredentials } from './user-credentials.entity';
import { UserRoleAssignment } from './user-role.entity';

describe('Entity enums', () => {
  it('should define TenantType values', () => {
    expect(TenantType.FAMILY).toBe('FAMILY');
    expect(TenantType.ORGANIZATION).toBe('ORGANIZATION');
    expect(TenantType.INTERNAL).toBe('INTERNAL');
    expect(Object.keys(TenantType)).toHaveLength(3);
  });

  it('should define UserStatus values', () => {
    expect(UserStatus.PENDING_VERIFICATION).toBe('PENDING_VERIFICATION');
    expect(UserStatus.ACTIVE).toBe('ACTIVE');
    expect(UserStatus.SUSPENDED).toBe('SUSPENDED');
    expect(Object.keys(UserStatus)).toHaveLength(3);
  });

  it('should define UserRole values matching the story API spec', () => {
    expect(UserRole.FAMILY_OWNER).toBe('FAMILY_OWNER');
    expect(UserRole.CAREGIVER).toBe('CAREGIVER');
    expect(UserRole.PROFESSIONAL_THERAPIST).toBe('PROFESSIONAL_THERAPIST');
    expect(UserRole.ORGANIZATION_ADMIN).toBe('ORGANIZATION_ADMIN');
    expect(UserRole.INTERNAL_ADMIN).toBe('INTERNAL_ADMIN');
    expect(Object.keys(UserRole)).toHaveLength(5);
  });
});

describe('Entity classes', () => {
  it('should instantiate a Tenant', () => {
    const tenant = new Tenant();
    tenant.id = '00000000-0000-0000-0000-000000000001';
    tenant.type = TenantType.FAMILY;
    tenant.name = 'Test Family';
    tenant.createdAt = new Date();

    expect(tenant.type).toBe(TenantType.FAMILY);
    expect(tenant.name).toBe('Test Family');
  });

  it('should instantiate a User with tenant linkage', () => {
    const user = new User();
    user.id = '00000000-0000-0000-0000-000000000002';
    user.tenantId = '00000000-0000-0000-0000-000000000001';
    user.email = 'Test@Example.com';
    user.emailNormalized = 'test@example.com';
    user.displayName = 'Test User';
    user.status = UserStatus.PENDING_VERIFICATION;
    user.emailVerifiedAt = null;
    user.acceptTermsAt = null;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    expect(user.tenantId).toBe('00000000-0000-0000-0000-000000000001');
    expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(user.emailVerifiedAt).toBeNull();
  });

  it('should instantiate UserCredentials linked to a User', () => {
    const creds = new UserCredentials();
    creds.userId = '00000000-0000-0000-0000-000000000002';
    creds.passwordHash = '$2b$12$hashed';
    creds.passwordAlgo = 'bcrypt';
    creds.createdAt = new Date();
    creds.updatedAt = new Date();

    expect(creds.userId).toBe('00000000-0000-0000-0000-000000000002');
    expect(creds.passwordAlgo).toBe('bcrypt');
  });

  it('should instantiate a UserRoleAssignment with tenant linkage', () => {
    const role = new UserRoleAssignment();
    role.id = '00000000-0000-0000-0000-000000000003';
    role.userId = '00000000-0000-0000-0000-000000000002';
    role.tenantId = '00000000-0000-0000-0000-000000000001';
    role.role = UserRole.FAMILY_OWNER;
    role.createdAt = new Date();

    expect(role.role).toBe(UserRole.FAMILY_OWNER);
    expect(role.tenantId).toBe('00000000-0000-0000-0000-000000000001');
  });
});
