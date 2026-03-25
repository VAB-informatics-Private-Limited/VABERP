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

@Entity('enquiries')
export class Enquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'assigned_to' })
  assignedEmployee: Employee;

  @Column({ name: 'enquiry_number', nullable: true })
  enquiryNumber: string;

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
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  pincode: string;

  @Column({ nullable: true })
  source: string; // 'Website', 'Referral', 'Walk-in', 'Phone', 'Email', etc.

  @Column({ name: 'interest_status', default: 'Enquiry' })
  interestStatus: string; // 'Enquiry', 'Follow Up', 'New Call', 'Not Interested', 'Prospect', 'Quotation Sent', 'Sale Closed'

  @Column({ nullable: true, type: 'text' })
  requirements: string;

  @Column({ nullable: true, type: 'text' })
  remarks: string;

  @Column({ name: 'next_followup_date', type: 'date', nullable: true })
  nextFollowupDate: Date | null;

  @Column({ name: 'expected_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedValue: number;

  @Column({ name: 'converted_customer_id', nullable: true })
  convertedCustomerId: number;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
