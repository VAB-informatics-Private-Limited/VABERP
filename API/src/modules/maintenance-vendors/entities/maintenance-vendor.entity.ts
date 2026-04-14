import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { AmcContract } from './amc-contract.entity';

@Entity('maintenance_vendors')
export class MaintenanceVendor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'vendor_code', type: 'varchar' })
  vendorCode: string;

  @Column({ name: 'company_name', type: 'varchar' })
  companyName: string;

  @Column({ name: 'contact_person', type: 'varchar', nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ nullable: true, type: 'text' })
  address: string | null;

  @Column({ name: 'gst_number', type: 'varchar', nullable: true })
  gstNumber: string | null;

  @Column({ name: 'service_categories', type: 'jsonb', default: '[]' })
  serviceCategories: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 'active' })
  status: string; // active | inactive | blacklisted

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @OneToMany(() => AmcContract, (a) => a.vendor)
  amcContracts: AmcContract[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
