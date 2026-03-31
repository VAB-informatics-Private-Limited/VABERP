import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaterialRequest } from './material-request.entity';
import { Product } from '../../products/entities/product.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';

@Entity('material_request_items')
export class MaterialRequestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'material_request_id' })
  materialRequestId: number;

  @ManyToOne(() => MaterialRequest)
  @JoinColumn({ name: 'material_request_id' })
  materialRequest: MaterialRequest;

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

  @Column({ name: 'quantity_requested', type: 'decimal', precision: 15, scale: 2 })
  quantityRequested: number;

  @Column({ name: 'quantity_approved', type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantityApproved: number;

  @Column({ name: 'quantity_issued', type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantityIssued: number;

  @Column({ name: 'available_stock', type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableStock: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'approved', 'rejected', 'issued'

  @Column({ nullable: true, type: 'text' })
  notes: string;
}
