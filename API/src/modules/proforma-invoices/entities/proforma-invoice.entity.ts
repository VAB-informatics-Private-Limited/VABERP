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
import { Customer } from '../../customers/entities/customer.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Quotation } from '../../quotations/entities/quotation.entity';
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';
import { ProformaInvoiceItem } from './proforma-invoice-item.entity';

@Entity('proforma_invoices')
export class ProformaInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'quotation_id', type: 'int', nullable: true })
  quotationId: number | null;

  @ManyToOne(() => Quotation, { nullable: true, eager: false })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @ManyToOne(() => Customer, { nullable: true, eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'pi_number' })
  piNumber: string;

  @Column({ name: 'pi_date', type: 'date' })
  piDate: Date;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  mobile: string | null;

  @Column({ name: 'billing_address', nullable: true, type: 'text' })
  billingAddress: string | null;

  @Column({ name: 'shipping_address', nullable: true, type: 'text' })
  shippingAddress: string | null;

  @Column({ name: 'sub_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: 'discount_type', type: 'varchar', nullable: true })
  discountType: string | null;

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

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'terms_conditions', nullable: true, type: 'text' })
  termsConditions: string | null;

  @Column({ default: 'draft' })
  status: string; // 'draft' | 'sent' | 'converted'

  @Column({ name: 'sales_order_id', type: 'int', nullable: true })
  salesOrderId: number | null;

  @ManyToOne(() => SalesOrder, { nullable: true, eager: false })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @OneToMany(() => ProformaInvoiceItem, (item) => item.proformaInvoice, { cascade: true })
  items: ProformaInvoiceItem[];

  @CreateDateColumn({ name: 'created_date', type: 'timestamptz' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date', type: 'timestamptz' })
  modifiedDate: Date;
}
