import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { Indent } from '../../indents/entities/indent.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { RfqVendor } from './rfq-vendor.entity';

@Entity('rfqs')
export class Rfq {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enterprise_id' })
  enterpriseId: number;

  @ManyToOne(() => Enterprise)
  @JoinColumn({ name: 'enterprise_id' })
  enterprise: Enterprise;

  @Column({ name: 'rfq_number' })
  rfqNumber: string;

  @Column({ name: 'indent_id' })
  indentId: number;

  @ManyToOne(() => Indent)
  @JoinColumn({ name: 'indent_id' })
  indent: Indent;

  @Column({ default: 'draft' })
  status: string; // 'draft' | 'sent' | 'completed'

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'created_by' })
  createdByEmployee: Employee;

  @Column({ name: 'sent_date', nullable: true, type: 'timestamp' })
  sentDate: Date;

  @OneToMany(() => RfqVendor, (v) => v.rfq, { cascade: true })
  vendors: RfqVendor[];

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;

  @UpdateDateColumn({ name: 'modified_date' })
  modifiedDate: Date;
}
