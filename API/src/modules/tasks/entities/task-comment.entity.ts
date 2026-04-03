import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'task_id' })
  taskId: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'text' })
  comment: string;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
