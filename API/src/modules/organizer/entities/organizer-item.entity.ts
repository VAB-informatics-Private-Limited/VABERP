import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { OrganizerContextLink } from './organizer-context-link.entity';
import { OrganizerActivityLog } from './organizer-activity-log.entity';
import { OrganizerRecurrenceRule } from './organizer-recurrence-rule.entity';

@Entity('organizer_items')
export class OrganizerItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @Column({ name: 'item_number', type: 'varchar' })
  itemNumber: string;

  @Column({ type: 'varchar' })
  type: string; // task | reminder | follow_up | recurring

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', default: 'medium' })
  priority: string; // low | medium | high | critical

  @Column({ type: 'varchar', default: 'open' })
  status: string; // open | in_progress | done | snoozed | cancelled

  @Column({ name: 'assigned_to', type: 'int', array: true, default: '{}' })
  assignedTo: number[];

  @Column({ name: 'created_by' })
  createdBy: number;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'remind_at', type: 'timestamptz', nullable: true })
  remindAt: Date | null;

  @Column({ name: 'snoozed_until', type: 'timestamptz', nullable: true })
  snoozedUntil: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrganizerContextLink, (l) => l.item, { eager: false })
  contextLinks: OrganizerContextLink[];

  @OneToMany(() => OrganizerActivityLog, (l) => l.item, { eager: false })
  activityLog: OrganizerActivityLog[];

  @OneToOne(() => OrganizerRecurrenceRule, (r) => r.item, { eager: false })
  recurrenceRule: OrganizerRecurrenceRule | null;
}
