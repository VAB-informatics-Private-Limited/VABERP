import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Reseller } from './reseller.entity';
import { SubscriptionPlan } from '../../super-admin/entities/subscription-plan.entity';

@Entity('reseller_plan_pricing')
export class ResellerPlanPricing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'reseller_id' })
  resellerId: number;

  @ManyToOne(() => Reseller)
  @JoinColumn({ name: 'reseller_id' })
  reseller: Reseller;

  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'reseller_price', type: 'decimal', precision: 10, scale: 2 })
  resellerPrice: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
