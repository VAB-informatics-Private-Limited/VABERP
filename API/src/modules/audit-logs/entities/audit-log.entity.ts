import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'user_type', nullable: true })
  userType: string; // 'employee', 'enterprise'

  @Column({ name: 'user_name', nullable: true })
  userName: string;

  @Column({ name: 'entity_type' })
  entityType: string; // 'enquiry', 'customer', 'invoice', 'payment', 'sales_order', etc.

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column()
  action: string; // 'create', 'update', 'delete', 'status_change', 'convert', 'payment', 'approve', 'issue', 'receive'

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
