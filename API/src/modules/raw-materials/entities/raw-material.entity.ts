import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';

export enum RawMaterialStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('raw_materials')
export class RawMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'material_code' })
  materialCode: string;

  @Column({ name: 'material_name' })
  materialName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ name: 'current_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentStock: number;

  @Column({ name: 'reserved_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  reservedStock: number;

  @Column({ name: 'available_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  availableStock: number;

  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStockLevel: number;

  @Column({ name: 'cost_per_unit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerUnit: number;

  @Column({ default: RawMaterialStatus.ACTIVE })
  status: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
