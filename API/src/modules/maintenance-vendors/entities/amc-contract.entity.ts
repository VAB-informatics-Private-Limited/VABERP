import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { MaintenanceVendor } from './maintenance-vendor.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { MachineCategory } from '../../machines/entities/machine-category.entity';

@Entity('amc_contracts')
export class AmcContract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'vendor_id' })
  vendorId: number;

  @ManyToOne(() => MaintenanceVendor, (v) => v.amcContracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: MaintenanceVendor;

  @Column({ name: 'machine_id', type: 'int', nullable: true })
  machineId: number | null;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => MachineCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: MachineCategory;

  @Column({ name: 'contract_number', type: 'varchar' })
  contractNumber: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'contract_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  contractValue: number | null;

  @Column({ name: 'visit_frequency_days', type: 'int', nullable: true })
  visitFrequencyDays: number | null;

  @Column({ name: 'max_visits_included', type: 'int', nullable: true })
  maxVisitsIncluded: number | null;

  @Column({ name: 'visits_used', type: 'int', default: 0 })
  visitsUsed: number;

  @Column({ name: 'coverage_details', nullable: true, type: 'text' })
  coverageDetails: string | null;

  @Column({ default: 'active' })
  status: string; // active | expired | terminated

  @Column({ name: 'document_url', nullable: true, type: 'text' })
  documentUrl: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
