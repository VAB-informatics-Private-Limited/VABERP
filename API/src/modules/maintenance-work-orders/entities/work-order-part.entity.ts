import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';
import { MaintenanceWorkOrder } from './maintenance-work-order.entity';

@Entity('maintenance_work_order_parts')
export class WorkOrderPart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'work_order_id' })
  workOrderId: number;

  @ManyToOne(() => MaintenanceWorkOrder, (wo) => wo.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: MaintenanceWorkOrder;

  @Column({ name: 'raw_material_id' })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ type: 'varchar', default: 'bom_auto' })
  source: string; // bom_auto | manual_add

  @Column({ name: 'quantity_required', type: 'decimal', precision: 10, scale: 3 })
  quantityRequired: number;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityReserved: number;

  @Column({ name: 'quantity_consumed', type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityConsumed: number;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ default: 'pending' })
  status: string; // pending | reserved | partial | consumed | cancelled

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
