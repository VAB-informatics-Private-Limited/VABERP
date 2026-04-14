import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';

@Entity('waste_sources')
export class WasteSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'source_type', type: 'varchar', default: 'department' })
  sourceType: string; // machine | department | process | external

  @Column({ name: 'reference_id', type: 'int', nullable: true })
  referenceId: number | null;

  @Column({ name: 'reference_type', type: 'varchar', nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
