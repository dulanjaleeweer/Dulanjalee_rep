import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserRole } from './enums';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';

@Entity('user_roles')
@Unique('UQ_user_roles_user_role', ['userId', 'role'])
export class UserRoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.roleAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;
}
