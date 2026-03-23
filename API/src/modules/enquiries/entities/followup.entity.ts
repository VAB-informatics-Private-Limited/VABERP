import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Enquiry } from './enquiry.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('followups')
export class Followup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'enquiry_id' })
  enquiryId: number;

  @ManyToOne(() => Enquiry)
  @JoinColumn({ name: 'enquiry_id' })
  enquiry: Enquiry;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'followup_type' })
  followupType: string; // 'Call', 'Email', 'Meeting', 'Visit', 'WhatsApp'

  @Column({ name: 'followup_date', type: 'timestamp' })
  followupDate: Date;

  @Column({ name: 'interest_status' })
  interestStatus: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'next_followup_date', type: 'date', nullable: true })
  nextFollowupDate: Date;

  @Column({ name: 'next_followup_type', nullable: true })
  nextFollowupType: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
