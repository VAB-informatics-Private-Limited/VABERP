import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('enterprises')
export class Enterprise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  mobile: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ name: 'gst_number', nullable: true })
  gstNumber: string;

  @Column({ name: 'cin_number', nullable: true })
  cinNumber: string;

  @Column({ name: 'contact_person', nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  website: string;

  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ name: 'mobile_verified', default: false })
  mobileVerified: boolean;

  @Column({ name: 'email_otp', nullable: true, type: 'varchar' })
  emailOtp: string | null;

  @Column({ name: 'mobile_otp', nullable: true, type: 'varchar' })
  mobileOtp: string | null;

  @Column({ name: 'plan_id', nullable: true, type: 'int' })
  planId: number | null;

  @Column({ name: 'subscription_start_date', type: 'date', nullable: true })
  subscriptionStartDate: Date | null;

  @Column({ name: 'reseller_id', nullable: true, type: 'int' })
  resellerId: number | null;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @Column({ name: 'task_visibility_unrestricted', default: false })
  taskVisibilityUnrestricted: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
