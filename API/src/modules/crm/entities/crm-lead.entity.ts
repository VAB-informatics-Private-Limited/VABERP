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
import { Customer } from '../../customers/entities/customer.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('crm_leads')
export class CrmLead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'lead_number' })
  leadNumber: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ name: 'business_name', nullable: true })
  businessName: string;

  @Column({ name: 'gst_number', nullable: true })
  gstNumber: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ nullable: true })
  source: string;

  @Column({ default: 'new' })
  status: string; // new|contacted|interested|not_interested|follow_up|converted|lost

  @Column({ name: 'expected_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedValue: number | null;

  @Column({ nullable: true, type: 'text' })
  requirements: string;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  @Column({ name: 'next_followup_date', type: 'date', nullable: true })
  nextFollowupDate: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedEmployee: Employee;

  @Column({ name: 'assigned_by', nullable: true })
  assignedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedByEmployee: Employee;

  @Column({ name: 'manager_id', nullable: true })
  managerId: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column({ name: 'converted_customer_id', type: 'int', nullable: true })
  convertedCustomerId: number | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
