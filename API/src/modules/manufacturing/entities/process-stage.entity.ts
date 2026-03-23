import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { JobCard } from './job-card.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { StageMaster } from '../../stage-masters/entities/stage-master.entity';

@Entity('process_stages')
export class ProcessStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'job_card_id' })
  jobCardId: number;

  @ManyToOne(() => JobCard)
  @JoinColumn({ name: 'job_card_id' })
  jobCard: JobCard;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'assigned_to' })
  assignedEmployee: Employee;

  @Column({ name: 'stage_master_id', nullable: true })
  stageMasterId: number;

  @ManyToOne(() => StageMaster, { nullable: true })
  @JoinColumn({ name: 'stage_master_id' })
  stageMaster: StageMaster;

  @Column({ name: 'stage_name' })
  stageName: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 6, scale: 2, nullable: true })
  actualHours: number;

  @Column({ name: 'start_time', type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'in_progress', 'completed', 'skipped'

  @Column({ name: 'completed_by', nullable: true })
  completedBy: number;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completedByEmployee: Employee;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
