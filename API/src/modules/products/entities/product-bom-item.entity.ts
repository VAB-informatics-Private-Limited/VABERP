import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductBom } from './product-bom.entity';
import { Product } from './product.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';

@Entity('product_bom_items')
export class ProductBomItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_bom_id' })
  productBomId: number;

  @ManyToOne(() => ProductBom, (bom) => bom.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_bom_id' })
  productBom: ProductBom;

  @Column({ name: 'raw_material_id', nullable: true })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'component_product_id', nullable: true })
  componentProductId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'component_product_id' })
  componentProduct: Product;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column('decimal', { name: 'required_quantity', precision: 15, scale: 2 })
  requiredQuantity: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ name: 'is_custom', default: false })
  isCustom: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
