import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { ServiceRule } from './service-rule.entity';

@Entity('product_types')
export class ProductType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column()
  name: string;

  @Column({ name: 'warranty_months', default: 12 })
  warrantyMonths: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: 'active' })
  status: string; // 'active' | 'inactive'

  @OneToMany(() => ServiceRule, (rule) => rule.productType, { cascade: true })
  serviceRules: ServiceRule[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
