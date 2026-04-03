import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('module_team_leaders')
@Unique(['enterpriseId', 'moduleName'])
export class ModuleTeamLeader {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'module_name' })
  moduleName: string;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
