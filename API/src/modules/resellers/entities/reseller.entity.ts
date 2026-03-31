import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('resellers')
export class Reseller {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  mobile: string;

  @Column({ name: 'company_name', type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'plan_id', type: 'integer', nullable: true })
  planId: number | null;

  @Column({ name: 'reseller_plan_id', type: 'integer', nullable: true })
  resellerPlanId: number | null;

  @Column({ name: 'subscription_start_date', type: 'timestamptz', nullable: true })
  subscriptionStartDate: Date | null;

  @Column({ name: 'expiry_date', type: 'timestamptz', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}
