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

@Entity('crm_activity_logs')
export class CrmActivityLog {
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

  @Column({ name: 'performed_by' })
  performedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'performed_by' })
  performedByEmployee: Employee;

  @Column()
  action: string; // lead_created|lead_assigned|lead_reassigned|status_changed|followup_added|converted|lost

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
