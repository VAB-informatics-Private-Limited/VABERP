import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { OrganizerItem } from './organizer-item.entity';

@Entity('organizer_recurrence_rules')
export class OrganizerRecurrenceRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  itemId: number;

  @OneToOne(() => OrganizerItem, (i) => i.recurrenceRule)
  @JoinColumn({ name: 'item_id' })
  item: OrganizerItem;

  @Column({ type: 'varchar' })
  frequency: string; // daily | weekly | monthly | custom

  @Column({ name: 'interval_days', type: 'int', nullable: true })
  intervalDays: number | null;

  @Column({ name: 'days_of_week', type: 'int', array: true, default: '{}' })
  daysOfWeek: number[];

  @Column({ name: 'day_of_month', type: 'int', nullable: true })
  dayOfMonth: number | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'max_occurrences', type: 'int', nullable: true })
  maxOccurrences: number | null;

  @Column({ name: 'occurrences_generated', type: 'int', default: 0 })
  occurrencesGenerated: number;

  @Column({ name: 'next_run_date', type: 'date' })
  nextRunDate: Date;

  @Column({ name: 'last_run_date', type: 'date', nullable: true })
  lastRunDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
