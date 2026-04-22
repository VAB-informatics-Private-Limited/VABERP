import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('spare_parts')
export class SparePart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'part_code', type: 'varchar', length: 64 })
  partCode: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'oem_part_no', type: 'varchar', length: 128, nullable: true })
  oemPartNo: string | null;

  @Column({ name: 'alt_part_no', type: 'varchar', length: 128, nullable: true })
  altPartNo: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer: string | null;

  @Column({ type: 'varchar', length: 32, default: 'pcs' })
  unit: string;

  @Column({ name: 'current_stock', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentStock: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minStock: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string; // active | discontinued

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
