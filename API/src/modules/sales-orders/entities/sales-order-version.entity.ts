import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('sales_order_versions')
@Index(['salesOrderId', 'versionNumber'], { unique: true })
export class SalesOrderVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sales_order_id' })
  salesOrderId: number;

  @ManyToOne(() => SalesOrder, (so) => so.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'version_number' })
  versionNumber: number;

  /**
   * Complete snapshot of the sales order header + all line items at this version.
   * Shape (mirrors DB columns, camelCase):
   * {
   *   orderDate, expectedDelivery, customerName, billingAddress, shippingAddress,
   *   subTotal, discountAmount, taxAmount, grandTotal, notes, status,
   *   items: [{ productId, itemName, description, quantity, unitOfMeasure,
   *             unitPrice, taxPercent, taxAmount, lineTotal, sortOrder }]
   * }
   */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  /** Auto-generated description of what changed (e.g. "Added item X", "Updated quantity of Y") */
  @Column({ name: 'change_summary', nullable: true, type: 'text' })
  changeSummary: string;

  /** Optional free-text note about what changed (provided by user from UI) */
  @Column({ name: 'change_notes', nullable: true, type: 'text' })
  changeNotes: string;

  @Column({ name: 'changed_by', nullable: true })
  changedBy: number;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'changed_by' })
  changedByEmployee: Employee;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
