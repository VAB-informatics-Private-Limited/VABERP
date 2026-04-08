import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Invoice } from './invoice.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'invoice_id' })
  invoiceId: number;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'payment_number' })
  paymentNumber: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string | undefined;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'payment_proof', nullable: true, type: 'text' })
  paymentProof: string;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'received_by' })
  receivedByEmployee: Employee;

  @Column({ default: 'pending' })
  status: string; // 'pending', 'completed', 'cancelled', 'refunded'

  @Column({ name: 'verified_by', nullable: true })
  verifiedBy: number;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
