import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProformaInvoice } from './proforma-invoice.entity';

@Entity('proforma_invoice_items')
export class ProformaInvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pi_id' })
  piId: number;

  @ManyToOne(() => ProformaInvoice, (pi) => pi.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pi_id' })
  proformaInvoice: ProformaInvoice;

  @Column({ name: 'product_id', type: 'int', nullable: true })
  productId: number | null;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column({ name: 'hsn_code', type: 'varchar', nullable: true })
  hsnCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
