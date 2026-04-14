import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';

@Entity('waste_categories')
export class WasteCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar', default: 'general' })
  classification: string; // recyclable | hazardous | general | e-waste | organic

  @Column({ type: 'varchar', default: 'kg' })
  unit: string;

  @Column({ name: 'requires_manifest', default: false })
  requiresManifest: boolean;

  @Column({ name: 'max_storage_days', type: 'int', nullable: true })
  maxStorageDays: number | null;

  @Column({ name: 'handling_notes', type: 'text', nullable: true })
  handlingNotes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
