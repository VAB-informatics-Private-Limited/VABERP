import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WasteParty } from './waste-party.entity';
import { WasteCategory } from '../../waste-inventory/entities/waste-category.entity';

@Entity('waste_party_rates')
export class WastePartyRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'party_id' })
  partyId: number;

  @ManyToOne(() => WasteParty, (p) => p.rates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: WasteParty;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => WasteCategory)
  @JoinColumn({ name: 'category_id' })
  category: WasteCategory;

  @Column({ name: 'rate_type', type: 'varchar' })
  rateType: string; // buy_rate | disposal_rate

  @Column({ type: 'decimal', precision: 14, scale: 4 })
  rate: number;

  @Column({ type: 'varchar', default: 'INR' })
  currency: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: Date | null;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
