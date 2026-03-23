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
import { Indent } from '../../indents/entities/indent.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'material_request_id', nullable: true })
  materialRequestId: number;

  @Column({ name: 'indent_id', nullable: true })
  indentId: number;

  @ManyToOne(() => Indent)
  @JoinColumn({ name: 'indent_id' })
  indent: Indent;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'po_number' })
  poNumber: string;

  @Column({ name: 'supplier_name' })
  supplierName: string;

  @Column({ name: 'supplier_contact', nullable: true })
  supplierContact: string;

  @Column({ name: 'supplier_email', nullable: true })
  supplierEmail: string;

  @Column({ name: 'supplier_phone', nullable: true })
  supplierPhone: string;

  @Column({ name: 'supplier_address', nullable: true, type: 'text' })
  supplierAddress: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @Column({ name: 'expected_delivery', type: 'date', nullable: true })
  expectedDelivery: Date | null;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'cancelled'

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'approved_by' })
  approvedByEmployee: Employee;

  @Column({ name: 'approved_date', type: 'date', nullable: true })
  approvedDate: Date | null;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
