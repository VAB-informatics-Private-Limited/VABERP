import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Quotation } from '../../quotations/entities/quotation.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Payment } from './payment.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'quotation_id', nullable: true })
  quotationId: number;

  @ManyToOne(() => Quotation)
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ name: 'sales_order_id', nullable: true })
  salesOrderId: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate: Date;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'billing_address', nullable: true, type: 'text' })
  billingAddress: string;

  @Column({ name: 'sub_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: 'discount_type', nullable: true })
  discountType: string;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountValue: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'shipping_charges', type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCharges: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ name: 'total_paid', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ name: 'balance_due', type: 'decimal', precision: 12, scale: 2, default: 0 })
  balanceDue: number;

  @Column({ name: 'terms_conditions', nullable: true, type: 'text' })
  termsConditions: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: 'unpaid' })
  status: string; // 'unpaid', 'partially_paid', 'fully_paid', 'overdue', 'cancelled'

  @OneToMany(() => Payment, (payment) => payment.invoice)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
