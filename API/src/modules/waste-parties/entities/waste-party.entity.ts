import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { WastePartyRate } from './waste-party-rate.entity';

@Entity('waste_parties')
export class WasteParty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'party_code', type: 'varchar' })
  partyCode: string;

  @Column({ name: 'company_name', type: 'varchar' })
  companyName: string;

  @Column({ name: 'party_type', type: 'varchar', default: 'vendor' })
  partyType: string; // vendor | customer | both

  @Column({ name: 'contact_person', type: 'varchar', nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'gst_number', type: 'varchar', nullable: true })
  gstNumber: string | null;

  @Column({ name: 'pollution_board_cert', type: 'varchar', nullable: true })
  pollutionBoardCert: string | null;

  @Column({ name: 'cert_expiry_date', type: 'date', nullable: true })
  certExpiryDate: Date | null;

  @Column({ name: 'handles_hazardous', default: false })
  handlesHazardous: boolean;

  @Column({ name: 'payment_terms', type: 'varchar', default: 'immediate' })
  paymentTerms: string;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => WastePartyRate, (r) => r.party)
  rates: WastePartyRate[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
