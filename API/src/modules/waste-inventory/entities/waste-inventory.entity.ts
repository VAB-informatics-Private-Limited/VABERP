import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { WasteCategory } from './waste-category.entity';
import { WasteSource } from './waste-source.entity';

@Entity('waste_inventory')
export class WasteInventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'batch_no', type: 'varchar' })
  batchNo: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => WasteCategory)
  @JoinColumn({ name: 'category_id' })
  category: WasteCategory;

  @Column({ name: 'source_id', type: 'int', nullable: true })
  sourceId: number | null;

  @ManyToOne(() => WasteSource, { nullable: true })
  @JoinColumn({ name: 'source_id' })
  source: WasteSource;

  @Column({ name: 'quantity_generated', type: 'decimal', precision: 14, scale: 3 })
  quantityGenerated: number;

  @Column({ name: 'quantity_available', type: 'decimal', precision: 14, scale: 3 })
  quantityAvailable: number;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 14, scale: 3, default: 0 })
  quantityReserved: number;

  @Column({ type: 'varchar', default: 'kg' })
  unit: string;

  @Column({ name: 'storage_location', type: 'varchar', nullable: true })
  storageLocation: string | null;

  @Column({ name: 'storage_date', type: 'date' })
  storageDate: Date;

  @Column({ name: 'expiry_alert_date', type: 'date', nullable: true })
  expiryAlertDate: Date | null;

  @Column({ type: 'varchar', default: 'available' })
  status: string; // available | partially_disposed | fully_disposed | reserved | expired | quarantined

  @Column({ name: 'manifest_number', type: 'varchar', nullable: true })
  manifestNumber: string | null;

  @Column({ name: 'hazard_level', type: 'varchar', nullable: true })
  hazardLevel: string | null;

  @Column({ name: 'estimated_value', type: 'decimal', precision: 14, scale: 2, nullable: true })
  estimatedValue: number | null;

  @Column({ name: 'work_order_id', type: 'int', nullable: true })
  workOrderId: number | null;

  @Column({ name: 'production_job_id', type: 'int', nullable: true })
  productionJobId: number | null;

  @Column({ name: 'entered_by', type: 'int', nullable: true })
  enteredBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'entered_by' })
  enteredByEmployee: Employee;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
