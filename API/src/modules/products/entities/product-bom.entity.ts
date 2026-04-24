import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Product } from './product.entity';
import { ProductBomItem } from './product-bom-item.entity';

@Entity('product_boms')
@Index('uq_product_boms_product_enterprise', ['productId', 'enterpriseId'], {
  unique: true,
  where: '"status" = \'active\'',
})
export class ProductBom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'product_id' })
  productId: number;

  @OneToOne(() => Product, (product) => product.productBom)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'bom_number' })
  bomNumber: string;

  @Column({ default: 1 })
  version: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  // active, archived
  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => ProductBomItem, (item) => item.productBom, { cascade: true })
  items: ProductBomItem[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
