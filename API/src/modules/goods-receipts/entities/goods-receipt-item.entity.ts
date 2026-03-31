import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GoodsReceipt } from './goods-receipt.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';
import { IndentItem } from '../../indents/entities/indent-item.entity';

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'grn_id' })
  grnId: number;

  @ManyToOne(() => GoodsReceipt, (grn) => grn.items)
  @JoinColumn({ name: 'grn_id' })
  goodsReceipt: GoodsReceipt;

  @Column({ name: 'indent_item_id', nullable: true })
  indentItemId: number;

  @ManyToOne(() => IndentItem)
  @JoinColumn({ name: 'indent_item_id' })
  indentItem: IndentItem;

  @Column({ name: 'raw_material_id', nullable: true })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ name: 'expected_qty', type: 'decimal', precision: 10, scale: 2 })
  expectedQty: number;

  @Column({ name: 'confirmed_qty', type: 'decimal', precision: 10, scale: 2, default: 0 })
  confirmedQty: number;

  @Column({ name: 'accepted_qty', type: 'decimal', precision: 10, scale: 2, default: 0 })
  acceptedQty: number;

  @Column({ name: 'rejected_qty', type: 'decimal', precision: 10, scale: 2, default: 0 })
  rejectedQty: number;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason: string; // 'damaged' | 'defective' | 'incorrect_item' | 'other'

  @Column({ default: 'pending' })
  status: string; // 'pending', 'confirmed', 'partial', 'rejected'

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'rtv_status', type: 'varchar', nullable: true })
  rtvStatus: string; // null | 'pending' | 'returned'

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
