import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserStatus } from './enums';
import { Tenant } from './tenant.entity';
import { UserCredentials } from './user-credentials.entity';
import { UserRoleAssignment } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  emailNormalized!: string;

  @Column({ type: 'varchar', length: 255 })
  displayName!: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status!: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  acceptTermsAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @OneToOne(() => UserCredentials, (creds) => creds.user, { cascade: true })
  credentials!: UserCredentials;

  @OneToMany(() => UserRoleAssignment, (role) => role.user, { cascade: true })
  roleAssignments!: UserRoleAssignment[];
}
