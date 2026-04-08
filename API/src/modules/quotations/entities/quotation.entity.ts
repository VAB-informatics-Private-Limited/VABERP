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
import { Enquiry } from '../../enquiries/entities/enquiry.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { QuotationVersion } from './quotation-version.entity';

@Entity('quotations')
export class Quotation {
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

  @Column({ name: 'enquiry_id', nullable: true })
  enquiryId: number;

  @ManyToOne(() => Enquiry)
  @JoinColumn({ name: 'enquiry_id' })
  enquiry: Enquiry;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'quotation_number' })
  quotationNumber: string;

  @Column({ name: 'quotation_date', type: 'date' })
  quotationDate: Date;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date | null;

  @Column({ name: 'expected_delivery', type: 'date', nullable: true })
  expectedDelivery: Date | null;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ name: 'billing_address', nullable: true, type: 'text' })
  billingAddress: string;

  @Column({ name: 'shipping_address', nullable: true, type: 'text' })
  shippingAddress: string;

  @Column({ name: 'sub_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: 'discount_type', nullable: true })
  discountType: string; // 'percentage' or 'amount'

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

  @Column({ name: 'terms_conditions', nullable: true, type: 'text' })
  termsConditions: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'delay_note', nullable: true, type: 'text' })
  delayNote: string;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'sent', 'accepted', 'rejected', 'expired'

  /** Monotonically increasing version counter. Starts at 1 on creation. */
  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  /** True once the quotation has been accepted and a Sales Order created from it. */
  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  /** Sales Order ID created when this quotation was accepted. */
  @Column({ name: 'sales_order_id', nullable: true, type: 'int' })
  salesOrderId: number | null;

  /** Last employee who performed an update (null when created by enterprise owner) */
  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  /** Timestamp when the linked Purchase Order was cancelled/deleted */
  @Column({ name: 'po_cancelled_at', type: 'timestamptz', nullable: true, default: null })
  poCancelledAt: Date | null;

  /** PO number of the cancelled Purchase Order (stored for display after PO deletion) */
  @Column({ name: 'cancelled_po_number', type: 'varchar', nullable: true, default: null })
  cancelledPoNumber: string | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByEmployee: Employee;

  @OneToMany(() => QuotationVersion, (v) => v.quotation)
  versions: QuotationVersion[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
