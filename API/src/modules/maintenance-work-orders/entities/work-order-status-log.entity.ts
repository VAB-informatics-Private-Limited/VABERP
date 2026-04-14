import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { MaintenanceWorkOrder } from './maintenance-work-order.entity';

@Entity('maintenance_work_order_status_logs')
export class WorkOrderStatusLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'work_order_id' })
  workOrderId: number;

  @ManyToOne(() => MaintenanceWorkOrder, (wo) => wo.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: MaintenanceWorkOrder;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus: string | null;

  @Column({ name: 'to_status', type: 'varchar' })
  toStatus: string;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  changedByEmployee: Employee;

  @Column({ nullable: true, type: 'text' })
  reason: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
