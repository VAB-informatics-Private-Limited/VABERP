import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobCard } from './job-card.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('job_card_stage_history')
export class JobCardStageHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'job_card_id' })
  jobCardId: number;

  @ManyToOne(() => JobCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_card_id' })
  jobCard: JobCard;

  @Column({ name: 'from_stage', nullable: true })
  fromStage: string;

  @Column({ name: 'to_stage' })
  toStage: string;

  @Column({ name: 'moved_by', nullable: true })
  movedBy: number;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'moved_by' })
  movedByEmployee: Employee;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
