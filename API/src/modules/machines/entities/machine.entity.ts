import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { MachineCategory } from './machine-category.entity';
import { MachineMeterLog } from './machine-meter-log.entity';

@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'machine_code', type: 'varchar' })
  machineCode: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => MachineCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: MachineCategory;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string | null;

  @Column({ name: 'model_number', type: 'varchar', nullable: true })
  modelNumber: string | null;

  @Column({ name: 'serial_number', type: 'varchar', nullable: true })
  serialNumber: string | null;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date | null;

  @Column({ name: 'installation_date', type: 'date', nullable: true })
  installationDate: Date | null;

  @Column({ name: 'warranty_expiry', type: 'date', nullable: true })
  warrantyExpiry: Date | null;

  @Column({ name: 'current_meter_reading', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentMeterReading: number;

  @Column({ name: 'meter_unit', type: 'varchar', default: 'hours' })
  meterUnit: string; // hours | km | cycles | units

  @Column({ default: 'active' })
  status: string; // active | under_maintenance | decommissioned | idle

  @Column({ default: 'medium' })
  criticality: string; // critical | high | medium | low

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @OneToMany(() => MachineMeterLog, (l) => l.machine)
  meterLogs: MachineMeterLog[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
