import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { ReminderRule } from './reminder-rule.entity';

@Entity('maintenance_reminders')
export class MaintenanceReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'rule_id' })
  ruleId: number;

  @ManyToOne(() => ReminderRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: ReminderRule;

  @Column({ name: 'machine_id' })
  machineId: number;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'due_at_meter', type: 'decimal', precision: 12, scale: 2, nullable: true })
  dueAtMeter: number | null;

  @Column({ name: 'trigger_type', type: 'varchar' })
  triggerType: string;

  @Column({ default: 'pending' })
  status: string; // pending | work_order_created | snoozed | overdue | cancelled

  @Column({ name: 'work_order_id', type: 'int', nullable: true })
  workOrderId: number | null;

  @Column({ name: 'snooze_until', type: 'date', nullable: true })
  snoozeUntil: Date | null;

  @Column({ name: 'snooze_count', type: 'int', default: 0 })
  snoozeCount: number;

  @Column({ name: 'overdue_notified_at', type: 'timestamptz', nullable: true })
  overdueNotifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
