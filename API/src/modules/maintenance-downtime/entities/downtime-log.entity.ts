import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from '../../machines/entities/machine.entity';

@Entity('maintenance_downtime_logs')
export class DowntimeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'machine_id' })
  machineId: number;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'work_order_id', type: 'int', nullable: true })
  workOrderId: number | null;

  @Column({ name: 'downtime_start', type: 'timestamptz' })
  downtimeStart: Date;

  @Column({ name: 'downtime_end', type: 'timestamptz', nullable: true })
  downtimeEnd: Date | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'reason_code', type: 'varchar', default: 'scheduled_maintenance' })
  reasonCode: string; // scheduled_maintenance | breakdown | waiting_parts | waiting_vendor | operator_error | power_failure | other

  @Column({ name: 'reason_detail', nullable: true, type: 'text' })
  reasonDetail: string | null;

  @Column({ default: 'full_stop' })
  impact: string; // full_stop | partial | no_impact

  @Column({ name: 'production_loss_units', type: 'int', nullable: true })
  productionLossUnits: number | null;

  @Column({ name: 'logged_by', type: 'int', nullable: true })
  loggedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'logged_by' })
  loggedByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
