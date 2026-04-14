import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { WasteDisposalTransaction } from './waste-disposal-transaction.entity';
import { WasteInventory } from '../../waste-inventory/entities/waste-inventory.entity';
import { WasteCategory } from '../../waste-inventory/entities/waste-category.entity';

@Entity('waste_disposal_lines')
export class WasteDisposalLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'transaction_id' })
  transactionId: number;

  @ManyToOne(() => WasteDisposalTransaction, (t) => t.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: WasteDisposalTransaction;

  @Column({ name: 'inventory_id' })
  inventoryId: number;

  @ManyToOne(() => WasteInventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: WasteInventory;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => WasteCategory)
  @JoinColumn({ name: 'category_id' })
  category: WasteCategory;

  @Column({ name: 'quantity_requested', type: 'decimal', precision: 14, scale: 3 })
  quantityRequested: number;

  @Column({ name: 'quantity_actual', type: 'decimal', precision: 14, scale: 3, nullable: true })
  quantityActual: number | null;

  @Column({ type: 'varchar', default: 'kg' })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  rate: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  revenue: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
