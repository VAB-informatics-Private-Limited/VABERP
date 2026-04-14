import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { WasteParty } from '../../waste-parties/entities/waste-party.entity';
import { WasteDisposalLine } from './waste-disposal-line.entity';

@Entity('waste_disposal_transactions')
export class WasteDisposalTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'transaction_no', type: 'varchar' })
  transactionNo: string;

  @Column({ name: 'party_id' })
  partyId: number;

  @ManyToOne(() => WasteParty)
  @JoinColumn({ name: 'party_id' })
  party: WasteParty;

  @Column({ name: 'transaction_type', type: 'varchar', default: 'disposal' })
  transactionType: string; // disposal | sale | internal_reuse

  @Column({ name: 'disposal_method', type: 'varchar', nullable: true })
  disposalMethod: string | null;

  @Column({ type: 'varchar', default: 'draft' })
  status: string; // draft | confirmed | in_transit | completed | cancelled

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate: Date;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: Date | null;

  @Column({ name: 'total_quantity', type: 'decimal', precision: 14, scale: 3, default: 0 })
  totalQuantity: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCost: number;

  @Column({ name: 'manifest_number', type: 'varchar', nullable: true })
  manifestNumber: string | null;

  @Column({ name: 'vehicle_number', type: 'varchar', nullable: true })
  vehicleNumber: string | null;

  @Column({ name: 'driver_name', type: 'varchar', nullable: true })
  driverName: string | null;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByEmployee: Employee;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => WasteDisposalLine, (l) => l.transaction, { cascade: true })
  lines: WasteDisposalLine[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
