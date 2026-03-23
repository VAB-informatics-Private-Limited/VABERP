import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('platform_payments')
export class PlatformPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method' })
  paymentMethod: string;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'pending' }) // pending | verified | rejected
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
