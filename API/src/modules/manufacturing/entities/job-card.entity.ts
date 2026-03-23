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
import { Product } from '../../products/entities/product.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Quotation } from '../../quotations/entities/quotation.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';
import { Bom } from './bom.entity';
import { StageMaster } from '../../stage-masters/entities/stage-master.entity';

@Entity('job_cards')
export class JobCard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'sales_order_id', nullable: true })
  purchaseOrderId: number;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  purchaseOrder: SalesOrder;

  @Column({ name: 'bom_id', nullable: true })
  bomId: number;

  @ManyToOne(() => Bom)
  @JoinColumn({ name: 'bom_id' })
  bom: Bom;

  @Column({ name: 'stage_master_id', nullable: true })
  stageMasterId: number;

  @ManyToOne(() => StageMaster)
  @JoinColumn({ name: 'stage_master_id' })
  stageMaster: StageMaster;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'quotation_id', nullable: true })
  quotationId: number;

  @ManyToOne(() => Quotation)
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Denormalized snapshot from PO — always available even if customerId is null
  @Column({ name: 'customer_name', type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'assigned_to' })
  assignedEmployee: Employee;

  @Column({ name: 'parent_job_card_id', nullable: true })
  parentJobCardId: number | null;

  @ManyToOne(() => JobCard, { nullable: true })
  @JoinColumn({ name: 'parent_job_card_id' })
  parentJobCard: JobCard;

  @Column({ name: 'stage_number', nullable: true, type: 'int' })
  stageNumber: number | null;

  @Column({ name: 'job_number' })
  jobNumber: string;

  @Column({ name: 'job_name' })
  jobName: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'expected_completion', type: 'date', nullable: true })
  expectedCompletion: Date | null;

  @Column({ name: 'actual_completion', type: 'date', nullable: true })
  actualCompletion: Date | null;

  @Column({ name: 'current_stage', nullable: true })
  currentStage: string;

  // 8-stage workflow status
  // pending → stock_verification → in_process / stock_not_available
  // in_process / partially_completed → completed_production → ready_for_dispatch → dispatched
  @Column({ default: 'pending' })
  status: string;

  @Column({ default: 0 })
  priority: number; // 1 = urgent, 2 = high, 3 = medium, 4 = low

  // Production tracking fields
  @Column({ name: 'estimated_production_days', nullable: true, type: 'int' })
  estimatedProductionDays: number | null;

  @Column({ name: 'quantity_completed', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityCompleted: number;

  @Column({ name: 'shortage_notes', nullable: true, type: 'text' })
  shortageNotes: string | null;

  @Column({ name: 'dispatch_on_hold', default: false })
  dispatchOnHold: boolean;

  // Stage-based production workflow
  @Column({ name: 'production_stage', default: 'MATERIAL_READY' })
  productionStage: string;
  // MATERIAL_READY | CUTTING | ASSEMBLY | QUALITY_CHECK | PACKING | READY_FOR_APPROVAL | APPROVED_FOR_DISPATCH | DISPATCHED

  @Column({ name: 'material_status', default: 'PENDING_INVENTORY' })
  materialStatus: string;
  // PENDING_INVENTORY | PARTIALLY_ISSUED | FULLY_ISSUED | REQUESTED_RECHECK

  // Selected material request items used for this job card (JSON array of MR item IDs + details)
  @Column({ name: 'selected_materials', type: 'jsonb', nullable: true })
  selectedMaterials: any;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
