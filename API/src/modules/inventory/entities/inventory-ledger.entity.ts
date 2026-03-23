import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Product } from '../../products/entities/product.entity';
import { Inventory } from './inventory.entity';

@Entity('inventory_ledger')
export class InventoryLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'inventory_id' })
  inventoryId: number;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'transaction_type' })
  transactionType: string; // 'IN', 'OUT', 'ADJUSTMENT', 'RETURN'

  @Column()
  quantity: number;

  @Column({ name: 'previous_stock', default: 0 })
  previousStock: number;

  @Column({ name: 'new_stock', default: 0 })
  newStock: number;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string; // 'PURCHASE', 'SALE', 'MANUFACTURING', 'MANUAL'

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number;

  @Column({ nullable: true })
  remarks: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'created_by_name', nullable: true })
  createdByName: string;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
