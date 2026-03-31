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
import { MaterialRequest } from '../../material-requests/entities/material-request.entity';
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('indents')
export class Indent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'indent_number' })
  indentNumber: string;

  @Column({ name: 'material_request_id', nullable: true })
  materialRequestId: number;

  @ManyToOne(() => MaterialRequest)
  @JoinColumn({ name: 'material_request_id' })
  materialRequest: MaterialRequest;

  @Column({ name: 'sales_order_id', nullable: true })
  salesOrderId: number;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'requested_by', nullable: true })
  requestedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'requested_by' })
  requestedByEmployee: Employee;

  @Column({ name: 'request_date', type: 'date' })
  requestDate: Date;

  @Column({ name: 'expected_delivery', type: 'date', nullable: true })
  expectedDelivery: Date | null;

  @Column({ default: 'material_request' })
  source: string; // 'material_request' or 'inventory'

  @Column({ default: 'pending' })
  status: string; // 'pending', 'partially_ordered', 'fully_ordered', 'closed', 'cancelled'

  @Column({ default: 'normal' })
  priority: string; // 'normal' | 'urgent'

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'parent_indent_id', nullable: true, type: 'int' })
  parentIndentId: number | null;

  @Column({ name: 'is_replacement', default: false })
  isReplacement: boolean;

  @Column({ name: 'rejection_reason', nullable: true, type: 'text' })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
