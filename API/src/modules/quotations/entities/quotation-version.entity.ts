import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Quotation } from './quotation.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Stores a full point-in-time snapshot of a quotation (header + items)
 * every time the quotation is updated.
 *
 * Snapshot semantics:
 *   - version_number = the version that existed BEFORE the edit
 *   - e.g. v1 → first-saved state, v2 → state after first edit, …
 *   - The current (latest) state is always on the quotations table itself.
 *
 * UNIQUE(quotation_id, version_number) prevents duplicates if something
 * calls update() twice in rapid succession.
 */
@Entity('quotation_versions')
@Index(['quotationId', 'versionNumber'], { unique: true })
export class QuotationVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotation_id' })
  quotationId: number;

  /**
   * onDelete: CASCADE ensures all versions are wiped when a quotation is deleted,
   * removing the need for a manual pre-delete step.
   */
  @ManyToOne(() => Quotation, (q) => q.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  /** v1, v2, v3 … matches quotations.current_version at the time of the edit */
  @Column({ name: 'version_number' })
  versionNumber: number;

  /**
   * Complete snapshot of the quotation header + all line items at this version.
   * Storing items inside JSONB avoids a separate quotation_version_items table
   * while still being fully readable and indexable via PostgreSQL JSONB operators.
   *
   * Shape (mirrors the DB columns, not the DTO):
   * {
   *   quotationDate, validUntil, customerName, email, mobile,
   *   billingAddress, shippingAddress, subTotal, discountType,
   *   discountValue, discountAmount, taxAmount, shippingCharges,
   *   grandTotal, termsConditions, notes, status,
   *   items: [{ productId, itemName, description, hsnCode, quantity,
   *             unitOfMeasure, unitPrice, discountPercent, taxPercent,
   *             taxAmount, lineTotal, sortOrder }]
   * }
   */
  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  /** Employee who triggered the update that created this version */
  @Column({ name: 'changed_by', nullable: true })
  changedBy: number;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'changed_by' })
  changedByEmployee: Employee;

  /** Optional free-text note about what changed (can be added from the UI) */
  @Column({ name: 'change_notes', nullable: true, type: 'text' })
  changeNotes: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;
}
