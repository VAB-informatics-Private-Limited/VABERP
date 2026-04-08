import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('print_template_versions')
export class PrintTemplateVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'version_number' })
  versionNumber: number;

  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  @Column({ name: 'change_notes', type: 'text', nullable: true })
  changeNotes: string | null;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
