import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { TenantType } from './enums';
import { User } from './user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: TenantType })
  type!: TenantType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => User, (user) => user.tenant)
  users!: User[];
}
