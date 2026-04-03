import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { CrmLead } from './crm-lead.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('crm_followups')
export class CrmFollowup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'crm_lead_id' })
  crmLeadId: number;

  @ManyToOne(() => CrmLead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crm_lead_id' })
  lead: CrmLead;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'followup_type', default: 'Call' })
  followupType: string; // Call|Email|Meeting|Visit|WhatsApp

  @Column({ name: 'followup_date', type: 'timestamp' })
  followupDate: Date;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'next_followup_date', type: 'date', nullable: true })
  nextFollowupDate: Date | null;

  @Column({ name: 'next_followup_type', nullable: true })
  nextFollowupType: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
