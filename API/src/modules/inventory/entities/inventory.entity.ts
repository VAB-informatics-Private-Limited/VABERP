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

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'current_stock', default: 0 })
  currentStock: number;

  @Column({ name: 'reserved_stock', default: 0 })
  reservedStock: number;

  @Column({ name: 'available_stock', default: 0 })
  availableStock: number;

  @Column({ name: 'min_stock_level', default: 0 })
  minStockLevel: number;

  @Column({ name: 'max_stock_level', nullable: true })
  maxStockLevel: number;

  @Column({ name: 'warehouse_location', nullable: true })
  warehouseLocation: string;

  @Column({ default: 'none' })
  priority: string;

  @Column({ name: 'last_restock_date', type: 'date', nullable: true })
  lastRestockDate: Date;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
