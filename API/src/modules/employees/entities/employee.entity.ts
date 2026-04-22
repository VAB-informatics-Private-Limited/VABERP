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
import { Department } from './department.entity';
import { Designation } from './designation.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'department_id', nullable: true })
  departmentId: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'designation_id', nullable: true })
  designationId: number;

  @ManyToOne(() => Designation)
  @JoinColumn({ name: 'designation_id' })
  designation: Designation;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate: Date;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'reporting_to', nullable: true, default: null })
  reportingTo: number | null;

  @Column({ name: 'is_reporting_head', default: false })
  isReportingHead: boolean;

  @Column({ name: 'reporting_manager_id', nullable: true, type: 'int' })
  reportingManagerId: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'reporting_to' })
  manager: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
