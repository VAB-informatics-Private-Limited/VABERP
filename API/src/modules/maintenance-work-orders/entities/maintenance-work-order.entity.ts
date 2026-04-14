import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { WorkOrderPart } from './work-order-part.entity';
import { WorkOrderStatusLog } from './work-order-status-log.entity';

@Entity('maintenance_work_orders')
export class MaintenanceWorkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'work_order_no', type: 'varchar' })
  workOrderNo: string;

  @Column({ name: 'machine_id' })
  machineId: number;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ name: 'reminder_id', type: 'int', nullable: true })
  reminderId: number | null;

  @Column({ name: 'service_type', type: 'varchar', default: 'preventive' })
  serviceType: string; // preventive | corrective | predictive | emergency | amc

  @Column({ type: 'varchar' })
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ default: 'medium' })
  priority: string; // critical | high | medium | low

  @Column({ default: 'created' })
  status: string; // created | assigned | in_progress | on_hold | completed | closed | cancelled

  @Column({ name: 'on_hold_reason', type: 'varchar', nullable: true })
  onHoldReason: string | null;

  @Column({ name: 'assigned_type', type: 'varchar', default: 'internal' })
  assignedType: string; // internal | vendor

  @Column({ name: 'assigned_technician_id', type: 'int', nullable: true })
  assignedTechnicianId: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assigned_technician_id' })
  assignedTechnician: Employee;

  @Column({ name: 'assigned_vendor_id', type: 'int', nullable: true })
  assignedVendorId: number | null;

  @Column({ name: 'scheduled_start', type: 'timestamptz', nullable: true })
  scheduledStart: Date | null;

  @Column({ name: 'scheduled_end', type: 'timestamptz', nullable: true })
  scheduledEnd: Date | null;

  @Column({ name: 'actual_start', type: 'timestamptz', nullable: true })
  actualStart: Date | null;

  @Column({ name: 'actual_end', type: 'timestamptz', nullable: true })
  actualEnd: Date | null;

  @Column({ name: 'completion_notes', nullable: true, type: 'text' })
  completionNotes: string | null;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedCost: number | null;

  @Column({ name: 'actual_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualCost: number | null;

  @Column({ name: 'labor_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  laborCost: number | null;

  @Column({ name: 'vendor_cost', type: 'decimal', precision: 12, scale: 2, nullable: true })
  vendorCost: number | null;

  @Column({ name: 'meter_reading_at_service', type: 'decimal', precision: 12, scale: 2, nullable: true })
  meterReadingAtService: number | null;

  @Column({ name: 'is_partial', default: false })
  isPartial: boolean;

  @Column({ name: 'parent_work_order_id', type: 'int', nullable: true })
  parentWorkOrderId: number | null;

  @Column({ name: 'bom_template_id', type: 'int', nullable: true })
  bomTemplateId: number | null;

  @Column({ name: 'closure_verified_by', type: 'int', nullable: true })
  closureVerifiedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'closure_verified_by' })
  closureVerifiedByEmployee: Employee;

  @Column({ name: 'closure_verified_at', type: 'timestamptz', nullable: true })
  closureVerifiedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @OneToMany(() => WorkOrderPart, (p) => p.workOrder)
  parts: WorkOrderPart[];

  @OneToMany(() => WorkOrderStatusLog, (l) => l.workOrder)
  statusLogs: WorkOrderStatusLog[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
