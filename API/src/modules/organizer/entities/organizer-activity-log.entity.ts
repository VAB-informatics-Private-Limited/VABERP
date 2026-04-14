import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrganizerItem } from './organizer-item.entity';

@Entity('organizer_activity_log')
export class OrganizerActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  itemId: number;

  @ManyToOne(() => OrganizerItem, (i) => i.activityLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: OrganizerItem;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar' })
  action: string; // created | status_changed | snoozed | completed | comment_added

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
