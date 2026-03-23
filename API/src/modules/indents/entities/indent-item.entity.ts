import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Indent } from './indent.entity';
import { MaterialRequestItem } from '../../material-requests/entities/material-request-item.entity';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';

@Entity('indent_items')
export class IndentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indent_id' })
  indentId: number;

  @ManyToOne(() => Indent)
  @JoinColumn({ name: 'indent_id' })
  indent: Indent;

  @Column({ name: 'material_request_item_id', nullable: true })
  materialRequestItemId: number;

  @ManyToOne(() => MaterialRequestItem)
  @JoinColumn({ name: 'material_request_item_id' })
  materialRequestItem: MaterialRequestItem;

  @Column({ name: 'raw_material_id', nullable: true })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'item_name' })
  itemName: string;

  @Column({ name: 'required_quantity', type: 'decimal', precision: 10, scale: 2 })
  requiredQuantity: number;

  @Column({ name: 'available_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  availableQuantity: number;

  @Column({ name: 'shortage_quantity', type: 'decimal', precision: 10, scale: 2 })
  shortageQuantity: number;

  @Column({ name: 'ordered_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  orderedQuantity: number;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  receivedQuantity: number;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure: string;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'ordered', 'received'

  @Column({ nullable: true, type: 'text' })
  notes: string;
}
