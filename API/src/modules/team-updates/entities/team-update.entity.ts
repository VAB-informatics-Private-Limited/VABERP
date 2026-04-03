import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('team_updates')
export class TeamUpdate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'manager_id' })
  managerId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  category: string; // announcement | task_update | reminder | general

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
