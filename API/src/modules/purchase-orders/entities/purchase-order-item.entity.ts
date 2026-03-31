import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../products/entities/product.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';
import { IndentItem } from '../../indents/entities/indent-item.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'raw_material_id', nullable: true })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'indent_item_id', nullable: true })
  indentItemId: number;

  @ManyToOne(() => IndentItem)
  @JoinColumn({ name: 'indent_item_id' })
  indentItem: IndentItem;

  @Column({ name: 'description', nullable: true })
  itemName: string;

  @Column()
  quantity: number;

  @Column({ name: 'received_quantity', default: 0 })
  quantityReceived: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ name: 'total', type: 'decimal', precision: 18, scale: 2, default: 0 })
  lineTotal: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
