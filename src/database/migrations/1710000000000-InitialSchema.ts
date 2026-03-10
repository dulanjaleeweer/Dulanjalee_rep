import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration for ABC EarlySteps.
 *
 * Creates the foundational tables required for tenant-aware user registration:
 *   - tenants          — multi-tenant root with type discrimination
 *   - users            — user accounts with globally-unique normalized email
 *   - user_credentials — password hashes (1-to-1 with users)
 *   - user_roles       — role assignments scoped to a tenant
 *
 * All tables use UUID primary keys and timestamptz for temporal columns.
 * Foreign keys enforce referential integrity; cascades are applied where
 * child records must not outlive their parent (credentials, roles → user).
 */
export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "tenant_type_enum" AS ENUM ('FAMILY', 'ORGANIZATION', 'INTERNAL')
    `);

    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED')
    `);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'FAMILY_OWNER',
        'CAREGIVER',
        'PROFESSIONAL_THERAPIST',
        'ORGANIZATION_ADMIN',
        'INTERNAL_ADMIN'
      )
    `);

    // ── tenants ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "type"       "tenant_type_enum" NOT NULL,
        "name"       varchar(255),
        "createdAt"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    // ── users ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenantId"          uuid NOT NULL,
        "email"             varchar(255) NOT NULL,
        "emailNormalized"   varchar(255) NOT NULL,
        "displayName"       varchar(255) NOT NULL,
        "status"            "user_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "emailVerifiedAt"   timestamptz,
        "acceptTermsAt"     timestamptz,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        "updatedAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email_normalized" UNIQUE ("emailNormalized"),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenantId")
    `);

    // ── user_credentials ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_credentials" (
        "userId"        uuid NOT NULL,
        "passwordHash"  varchar(255) NOT NULL,
        "passwordAlgo"  varchar(20) NOT NULL DEFAULT 'bcrypt',
        "createdAt"     timestamptz NOT NULL DEFAULT now(),
        "updatedAt"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_credentials" PRIMARY KEY ("userId"),
        CONSTRAINT "FK_user_credentials_user" FOREIGN KEY ("userId")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // ── user_roles ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "id"        uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId"    uuid NOT NULL,
        "tenantId"  uuid NOT NULL,
        "role"      "user_role_enum" NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_roles_user_role" UNIQUE ("userId", "role"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("userId")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_tenant" FOREIGN KEY ("tenantId")
          REFERENCES "tenants" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_credentials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenant_type_enum"`);
  }
}
