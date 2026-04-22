import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { SparePart } from './spare-part.entity';

@Entity('machine_spares')
export class MachineSpare {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'machine_id' })
  machineId: number;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'spare_part_id' })
  sparePartId: number;

  @ManyToOne(() => SparePart)
  @JoinColumn({ name: 'spare_part_id' })
  sparePart: SparePart;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 24, default: 'manual' })
  source: string; // template_model | template_category | manual

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
