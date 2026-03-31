import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ServiceMaster } from '../../services-master/entities/service-master.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'duration_days', default: 30 })
  durationDays: number;

  @Column({ name: 'max_employees', default: 0 })
  maxEmployees: number;

  @Column({ type: 'text', nullable: true })
  features: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'duration_type', default: 'days' })
  durationType: string;

  @Column({ name: 'number_of_services_allowed', default: 0 })
  numberOfServicesAllowed: number;

  @ManyToMany(() => ServiceMaster)
  @JoinTable({
    name: 'plan_services',
    joinColumn: { name: 'plan_id' },
    inverseJoinColumn: { name: 'service_id' },
  })
  services: ServiceMaster[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'updated_date' })
  updatedDate: Date;
}
