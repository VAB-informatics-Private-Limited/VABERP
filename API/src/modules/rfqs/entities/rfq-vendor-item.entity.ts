import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { RfqVendor } from './rfq-vendor.entity';
import { IndentItem } from '../../indents/entities/indent-item.entity';

@Entity('rfq_vendor_items')
export class RfqVendorItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rfq_vendor_id' })
  rfqVendorId: number;

  @ManyToOne(() => RfqVendor, (v) => v.items)
  @JoinColumn({ name: 'rfq_vendor_id' })
  rfqVendor: RfqVendor;

  @Column({ name: 'indent_item_id' })
  indentItemId: number;

  @ManyToOne(() => IndentItem)
  @JoinColumn({ name: 'indent_item_id' })
  indentItem: IndentItem;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;
}
