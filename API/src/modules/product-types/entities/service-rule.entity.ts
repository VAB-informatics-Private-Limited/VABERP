import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductType } from './product-type.entity';

@Entity('service_rules')
export class ServiceRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_type_id' })
  productTypeId: number;

  @ManyToOne(() => ProductType, (pt) => pt.serviceRules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_type_id' })
  productType: ProductType;

  // Days after dispatch when this event should fire (e.g. 30, 90, 365)
  @Column({ name: 'day_offset' })
  dayOffset: number;

  @Column({ name: 'event_type' })
  eventType: string; // 'free_service' | 'paid_service' | 'amc_reminder' | 'warranty_expiry'

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
