import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'task_number' })
  taskNumber: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: 'medium' })
  priority: string; // low|medium|high|urgent

  @Column({ default: 'pending' })
  status: string; // pending|in_progress|completed|cancelled

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'assigned_to', nullable: true, type: 'int' })
  assignedTo: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedEmployee: Employee;

  @Column({ name: 'assigned_by', nullable: true, type: 'int' })
  assignedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByEmployee: Employee;

  @Column({ name: 'created_by', nullable: true, type: 'int' })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ nullable: true })
  module: string;

  @Column({ name: 'related_entity_type', nullable: true })
  relatedEntityType: string;

  @Column({ name: 'related_entity_id', nullable: true, type: 'int' })
  relatedEntityId: number | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
