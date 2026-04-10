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
import { ServiceProduct } from '../../service-products/entities/service-product.entity';
import { ServiceRule } from '../../product-types/entities/service-rule.entity';

@Entity('service_events')
export class ServiceEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'service_product_id' })
  serviceProductId: number;

  @ManyToOne(() => ServiceProduct, (sp) => sp.serviceEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_product_id' })
  serviceProduct: ServiceProduct;

  @Column({ name: 'rule_id', nullable: true })
  ruleId: number | null;

  @ManyToOne(() => ServiceRule, { nullable: true })
  @JoinColumn({ name: 'rule_id' })
  rule: ServiceRule;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'event_type' })
  eventType: string; // 'free_service' | 'paid_service' | 'amc_reminder' | 'warranty_expiry'

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'reminded' | 'booked' | 'completed' | 'expired'

  @Column({ name: 'reminder_count', default: 0 })
  reminderCount: number;

  @Column({ name: 'last_reminder_at', type: 'timestamptz', nullable: true })
  lastReminderAt: Date | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
