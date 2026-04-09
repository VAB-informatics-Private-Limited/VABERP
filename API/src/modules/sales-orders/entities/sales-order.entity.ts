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
import { Enquiry } from '../../enquiries/entities/enquiry.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { SalesOrderVersion } from './sales-order-version.entity';

@Entity('sales_orders')
export class SalesOrder {
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

  @Column({ name: 'order_number' })
  orderNumber: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @Column({ name: 'expected_delivery', type: 'date', nullable: true })
  expectedDelivery: Date | null;

  @Column({ name: 'delay_note', type: 'text', nullable: true })
  delayNote: string | null;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'billing_address', nullable: true, type: 'text' })
  billingAddress: string;

  @Column({ name: 'shipping_address', nullable: true, type: 'text' })
  shippingAddress: string;

  @Column({ name: 'sub_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'grand_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ name: 'invoiced_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  invoicedAmount: number;

  @Column({ name: 'sent_to_manufacturing', default: false })
  sentToManufacturing: boolean;

  @Column({ name: 'material_approval_status', default: 'none' })
  materialApprovalStatus: string; // 'none', 'pending_approval', 'approved', 'rejected'

  @Column({ name: 'material_request_id', nullable: true })
  materialRequestId: number;

  @Column({ name: 'manufacturing_priority', default: 0 })
  manufacturingPriority: number; // 0=normal, 1=high, 2=urgent

  @Column({ name: 'manufacturing_notes', nullable: true, type: 'text' })
  manufacturingNotes: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'hold_reason', nullable: true, type: 'text' })
  holdReason: string;

  @Column({ name: 'hold_acknowledged', default: false })
  holdAcknowledged: boolean;

  @Column({ default: 'confirmed' })
  status: string; // 'confirmed', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled', 'on_hold', 'under_verification'

  @Column({ name: 'under_verification_at', type: 'timestamptz', nullable: true })
  underVerificationAt: Date | null;

  @Column({ name: 'current_version', default: 1 })
  currentVersion: number;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByEmployee: Employee;

  @OneToMany(() => SalesOrderVersion, (v) => v.salesOrder)
  versions: SalesOrderVersion[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
