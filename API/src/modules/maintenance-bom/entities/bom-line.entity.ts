import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { RawMaterial } from '../../raw-materials/entities/raw-material.entity';
import { BomTemplate } from './bom-template.entity';

@Entity('maintenance_bom_lines')
export class BomLine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @ManyToOne(() => BomTemplate, (t) => t.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: BomTemplate;

  @Column({ name: 'raw_material_id' })
  rawMaterialId: number;

  @ManyToOne(() => RawMaterial)
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: RawMaterial;

  @Column({ name: 'quantity_required', type: 'decimal', precision: 10, scale: 3 })
  quantityRequired: number;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
