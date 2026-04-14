import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from './machine.entity';

@Entity('machine_meter_logs')
export class MachineMeterLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'machine_id' })
  machineId: number;

  @ManyToOne(() => Machine, (m) => m.meterLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'reading_value', type: 'decimal', precision: 12, scale: 2 })
  readingValue: number;

  @Column({ name: 'reading_date', type: 'date' })
  readingDate: Date;

  @Column({ name: 'recorded_by', type: 'int', nullable: true })
  recordedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'recorded_by' })
  recordedByEmployee: Employee;

  @Column({ type: 'varchar', default: 'manual' })
  source: string; // manual | auto | work_order_close

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
