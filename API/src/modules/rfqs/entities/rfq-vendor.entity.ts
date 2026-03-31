import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Rfq } from './rfq.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { RfqVendorItem } from './rfq-vendor-item.entity';

@Entity('rfq_vendors')
export class RfqVendor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rfq_id' })
  rfqId: number;

  @ManyToOne(() => Rfq, (r) => r.vendors)
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @Column({ name: 'supplier_id' })
  supplierId: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'responded' | 'rejected'

  @Column({ name: 'email_sent_at', nullable: true, type: 'timestamp' })
  emailSentAt: Date;

  @Column({ name: 'quote_pdf_path', nullable: true })
  quotePdfPath: string;

  @Column({ name: 'delivery_days', nullable: true, type: 'int' })
  deliveryDays: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => RfqVendorItem, (i) => i.rfqVendor, { cascade: true })
  items: RfqVendorItem[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
