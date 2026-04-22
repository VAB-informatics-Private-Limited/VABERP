import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { MachineCategory } from '../../machines/entities/machine-category.entity';
import { SparePart } from './spare-part.entity';

@Entity('machine_spare_map')
export class MachineSpareMap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'spare_part_id' })
  sparePartId: number;

  @ManyToOne(() => SparePart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spare_part_id' })
  sparePart: SparePart;

  // High-priority scope key
  @Column({ name: 'model_number', type: 'varchar', length: 128, nullable: true })
  modelNumber: string | null;

  // Fallback scope key
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => MachineCategory, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: MachineCategory;

  @Column({ name: 'default_quantity', type: 'decimal', precision: 12, scale: 2, default: 1 })
  defaultQuantity: number;

  @Column({ name: 'is_mandatory', default: false })
  isMandatory: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'smallint', default: 100 })
  priority: number;

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
