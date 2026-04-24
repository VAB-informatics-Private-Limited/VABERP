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
import { SalesOrder } from '../../sales-orders/entities/sales-order.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductBom } from '../../products/entities/product-bom.entity';
import { BomItem } from './bom-item.entity';

@Entity('bill_of_materials')
export class Bom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'sales_order_id' })
  purchaseOrderId: number;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  purchaseOrder: SalesOrder;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_bom_id', nullable: true })
  productBomId: number;

  @ManyToOne(() => ProductBom, { nullable: true })
  @JoinColumn({ name: 'product_bom_id' })
  productBom: ProductBom;

  @Column({ name: 'source_version', nullable: true })
  sourceVersion: number;

  @Column({ name: 'bom_number' })
  bomNumber: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  quantity: number;

  // pending, stock_checked, in_progress, completed
  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => BomItem, (item) => item.bom, { cascade: true })
  items: BomItem[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
