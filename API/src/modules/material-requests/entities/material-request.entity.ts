import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { JobCard } from '../../manufacturing/entities/job-card.entity';
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';

@Entity('material_requests')
export class MaterialRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'job_card_id', nullable: true })
  jobCardId: number;

  @ManyToOne(() => JobCard)
  @JoinColumn({ name: 'job_card_id' })
  jobCard: JobCard;

  @Column({ name: 'sales_order_id', nullable: true })
  salesOrderId: number;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'request_number' })
  requestNumber: string;

  @Column({ name: 'requested_by', nullable: true })
  requestedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requested_by' })
  requestedByEmployee: Employee;

  @Column({ name: 'request_date', type: 'date' })
  requestDate: Date;

  @Column({ nullable: true })
  purpose: string;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'approved', 'partially_approved', 'rejected', 'fulfilled', 'cancelled'

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'approved_by' })
  approvedByEmployee: Employee;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: Date | null;

  @Column({ name: 'indent_id', nullable: true })
  indentId: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
