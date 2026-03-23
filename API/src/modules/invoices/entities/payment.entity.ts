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

  @Column({ name: 'payment_method' })
  paymentMethod: string; // 'cash', 'bank_transfer', 'cheque', 'upi', 'card', 'other'

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'received_by' })
  receivedByEmployee: Employee;

  @Column({ default: 'completed' })
  status: string; // 'completed', 'pending', 'cancelled', 'refunded'

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
