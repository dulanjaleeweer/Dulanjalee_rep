import { InitialSchema1710000000000 } from './1710000000000-InitialSchema';

describe('InitialSchema migration', () => {
  const migration = new InitialSchema1710000000000();

  it('should have correct name', () => {
    expect(migration.name).toBe('InitialSchema1710000000000');
  });

  it('up() should execute SQL statements to create tables', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      }),
    };

    await migration.up(mockQueryRunner as any);

    // Should create 3 enum types
    expect(queries.filter((q) => q.includes('CREATE TYPE'))).toHaveLength(3);
    expect(queries.some((q) => q.includes('tenant_type_enum'))).toBe(true);
    expect(queries.some((q) => q.includes('user_status_enum'))).toBe(true);
    expect(queries.some((q) => q.includes('user_role_enum'))).toBe(true);

    // Should create 4 tables
    expect(queries.filter((q) => q.includes('CREATE TABLE'))).toHaveLength(4);
    expect(queries.some((q) => q.includes('"tenants"'))).toBe(true);
    expect(queries.some((q) => q.includes('"users"'))).toBe(true);
    expect(queries.some((q) => q.includes('"user_credentials"'))).toBe(true);
    expect(queries.some((q) => q.includes('"user_roles"'))).toBe(true);

    // Should create indexes
    expect(queries.some((q) => q.includes('IDX_users_tenant_id'))).toBe(true);
    expect(queries.some((q) => q.includes('IDX_user_roles_user_id'))).toBe(true);

    // Should enforce global email uniqueness
    expect(queries.some((q) => q.includes('UQ_users_email_normalized'))).toBe(true);

    // Should enforce unique user+role constraint
    expect(queries.some((q) => q.includes('UQ_user_roles_user_role'))).toBe(true);

    // Should create FK from users to tenants
    expect(queries.some((q) => q.includes('FK_users_tenant'))).toBe(true);

    // Should cascade delete from users to credentials
    expect(queries.some((q) => q.includes('FK_user_credentials_user'))).toBe(true);
    expect(queries.some((q) => q.includes('ON DELETE CASCADE'))).toBe(true);
  });

  it('down() should drop tables and types in correct order', async () => {
    const queries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn((sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      }),
    };

    await migration.down(mockQueryRunner as any);

    // Should drop 4 tables and 3 types
    expect(queries).toHaveLength(7);

    // Tables dropped before types (dependency order)
    const tableDrops = queries.filter((q) => q.includes('DROP TABLE'));
    const typeDrops = queries.filter((q) => q.includes('DROP TYPE'));
    expect(tableDrops).toHaveLength(4);
    expect(typeDrops).toHaveLength(3);

    // user_roles and user_credentials before users, users before tenants
    const userRolesIdx = queries.findIndex((q) => q.includes('"user_roles"'));
    const userCredsIdx = queries.findIndex((q) => q.includes('"user_credentials"'));
    const usersIdx = queries.findIndex((q) => q.includes('"users"'));
    const tenantsIdx = queries.findIndex((q) => q.includes('"tenants"'));
    expect(userRolesIdx).toBeLessThan(usersIdx);
    expect(userCredsIdx).toBeLessThan(usersIdx);
    expect(usersIdx).toBeLessThan(tenantsIdx);
  });
});
