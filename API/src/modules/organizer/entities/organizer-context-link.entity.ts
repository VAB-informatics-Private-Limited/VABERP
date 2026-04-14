import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrganizerItem } from './organizer-item.entity';

@Entity('organizer_context_links')
export class OrganizerContextLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  itemId: number;

  @ManyToOne(() => OrganizerItem, (i) => i.contextLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: OrganizerItem;

  @Column({ name: 'entity_type', type: 'varchar' })
  entityType: string; // enquiry | customer | machine | vendor | work_order

  @Column({ name: 'entity_id' })
  entityId: number;

  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
