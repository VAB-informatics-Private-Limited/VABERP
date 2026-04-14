import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { MachineCategory } from '../../machines/entities/machine-category.entity';

@Entity('maintenance_reminder_rules')
export class ReminderRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ type: 'varchar' })
  name: string;

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

  @Column({ name: 'trigger_type', type: 'varchar', default: 'time_based' })
  triggerType: string; // time_based | usage_based | both

  @Column({ name: 'interval_days', type: 'int', nullable: true })
  intervalDays: number | null;

  @Column({ name: 'interval_units', type: 'decimal', precision: 12, scale: 2, nullable: true })
  intervalUnits: number | null;

  @Column({ name: 'advance_notice_days', type: 'int', default: 7 })
  advanceNoticeDays: number;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ name: 'is_recurring', default: true })
  isRecurring: boolean;

  @Column({ name: 'bom_template_id', type: 'int', nullable: true })
  bomTemplateId: number | null;

  @Column({ name: 'preferred_vendor_id', type: 'int', nullable: true })
  preferredVendorId: number | null;

  @Column({ name: 'overdue_notify_after_days', type: 'int', default: 1 })
  overdueNotifyAfterDays: number;

  @Column({ default: 'active' })
  status: string; // active | paused | archived

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
