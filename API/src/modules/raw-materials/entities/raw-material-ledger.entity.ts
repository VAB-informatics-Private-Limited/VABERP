import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { RawMaterial } from './raw-material.entity';

export enum RawMaterialTransactionType {
  PURCHASE = 'purchase',
  ISSUE = 'issue',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
}

@Entity('raw_material_ledger')
export class RawMaterialLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'raw_material_id' })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'transaction_type' })
  transactionType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'previous_stock', type: 'decimal', precision: 10, scale: 2 })
  previousStock: number;

  @Column({ name: 'new_stock', type: 'decimal', precision: 10, scale: 2 })
  newStock: number;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
