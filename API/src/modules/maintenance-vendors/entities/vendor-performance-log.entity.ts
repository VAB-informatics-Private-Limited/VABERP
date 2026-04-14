import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { MaintenanceVendor } from './maintenance-vendor.entity';

@Entity('vendor_performance_logs')
export class VendorPerformanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'vendor_id' })
  vendorId: number;

  @ManyToOne(() => MaintenanceVendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: MaintenanceVendor;

  @Column({ name: 'work_order_id', type: 'int', nullable: true })
  workOrderId: number | null;

  @Column({ name: 'response_time_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  responseTimeHours: number | null;

  @Column({ name: 'completion_time_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  completionTimeHours: number | null;

  @Column({ name: 'quality_score', type: 'int', nullable: true })
  qualityScore: number | null;

  @Column({ name: 'delay_days', type: 'int', default: 0 })
  delayDays: number;

  @Column({ name: 'rated_by', type: 'int', nullable: true })
  ratedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'rated_by' })
  ratedByEmployee: Employee;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
