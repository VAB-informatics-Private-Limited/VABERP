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

@Entity('job_card_progress')
export class JobCardProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'job_card_id' })
  jobCardId: number;

  @ManyToOne(() => JobCard, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_card_id' })
  jobCard: JobCard;

  @Column({ name: 'progress_date', type: 'date' })
  progressDate: string;

  @Column({ name: 'quantity_completed', type: 'decimal', precision: 10, scale: 2 })
  quantityCompleted: number;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  employee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
