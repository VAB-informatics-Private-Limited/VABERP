import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { MachineCategory } from '../../machines/entities/machine-category.entity';
import { BomLine } from './bom-line.entity';

@Entity('maintenance_bom_templates')
export class BomTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'machine_id', type: 'int', nullable: true })
  machineId: number | null;

  @ManyToOne(() => Machine, { nullable: true })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => MachineCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: MachineCategory;

  @Column({ name: 'service_type', type: 'varchar', default: 'preventive' })
  serviceType: string; // preventive | corrective | predictive | amc

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @OneToMany(() => BomLine, (l) => l.template)
  lines: BomLine[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
