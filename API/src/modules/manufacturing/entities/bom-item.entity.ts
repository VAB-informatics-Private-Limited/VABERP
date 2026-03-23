import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Bom } from './bom.entity';
import { Product } from '../../products/entities/product.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';

@Entity('bom_items')
export class BomItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bom_id' })
  bomId: number;

  @ManyToOne(() => Bom, (bom) => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom: Bom;

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

  @Column({ name: 'item_name' })
  itemName: string;

  @Column('decimal', { name: 'required_quantity', precision: 10, scale: 2 })
  requiredQuantity: number;

  @Column('decimal', { name: 'available_quantity', precision: 10, scale: 2, default: 0 })
  availableQuantity: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  // available, shortage
  @Column({ default: 'available' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'is_custom', default: false })
  isCustom: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
